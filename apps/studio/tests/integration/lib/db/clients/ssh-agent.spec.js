// Regression test for https://github.com/beekeeper-studio/beekeeper-studio/issues/4193
//
// SSH Agent mode must succeed even when the user's ~/.ssh/config has an
// IdentityFile pointing at a path that doesn't exist on disk. Before the
// fix, connection-provider populated ssh.privateKey from that IdentityFile
// and tunnel.ts then tried to readFileSync() it, throwing ENOENT.

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'

let mockSshAuthSock
jest.mock('@/common/platform_info', () => {
  const actual = jest.requireActual('@/common/platform_info')
  return {
    __esModule: true,
    default: new Proxy(actual.default, {
      get(target, prop) {
        if (prop === 'sshAuthSock') return mockSshAuthSock
        return target[prop]
      },
    }),
  }
})

const ConnectionProvider = require('@commercial/backend/lib/connection-provider').default

describe('SSH Tunnel Tests (agent mode, #4193)', () => {
  jest.setTimeout(dbtimeout)

  let environment
  let container
  let database
  let connection
  let workDir
  let agentPid
  let originalHome

  beforeAll(async () => {
    await TestOrmConnection.connect()

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-ssh-agent-'))
    const keyPath = path.join(workDir, 'id_ed25519')
    execSync(`ssh-keygen -t ed25519 -f "${keyPath}" -N "" -q`)
    const publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf-8').trim()

    const sock = path.join(workDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    execSync(`ssh-add "${keyPath}"`, {
      env: { ...process.env, SSH_AUTH_SOCK: sock },
      stdio: 'pipe',
    })

    // Build a fake HOME with an SSH config whose IdentityFile points at a
    // path that does not exist. This is what connection-provider reads in
    // agent mode and is the exact shape that triggered #4193.
    const fakeHome = path.join(workDir, 'home')
    fs.mkdirSync(path.join(fakeHome, '.ssh'), { recursive: true })
    fs.writeFileSync(
      path.join(fakeHome, '.ssh', 'config'),
      `Host *\n  IdentityFile ${path.join(workDir, 'does-not-exist')}\n`,
    )
    originalHome = process.env.HOME
    process.env.HOME = fakeHome

    environment = await new DockerComposeEnvironment('tests/docker', 'ssh.yml')
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage('database system is ready to accept connections', 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .up(['postgres', 'ssh'])

    container = environment.getContainer('test_ssh')

    await container.exec([
      'sh',
      '-c',
      `mkdir -p /config/.ssh && echo '${publicKey}' >> /config/.ssh/authorized_keys && chmod 700 /config/.ssh && chmod 600 /config/.ssh/authorized_keys && chown -R abc:abc /config/.ssh`,
    ])

    const config = {
      connectionType: 'postgresql',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshMode: 'agent',
      sshHost: container.getHost(),
      sshPort: container.getMappedPort(2222),
      sshUsername: 'beekeeper',
    }

    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  describe('Can SSH via agent and run a query', () => {
    it('should work even when ~/.ssh/config IdentityFile path does not exist', async () => {
      const query = await database.query('select 1')
      await query.execute()
    })
  })

  afterAll(async () => {
    if (database) {
      await database.disconnect()
    }
    if (environment) {
      await environment.stop()
    }
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
    if (agentPid) {
      try { process.kill(agentPid) } catch (_e) { /* ignore */ }
    }
    if (workDir && fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true })
    }
    await TestOrmConnection.disconnect()
  })
})
