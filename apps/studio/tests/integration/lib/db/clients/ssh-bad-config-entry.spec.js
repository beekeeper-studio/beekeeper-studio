// Regression test for https://github.com/beekeeper-studio/beekeeper-studio/issues/4366
//
// OpenSSH behaviour: when ~/.ssh/config lists several IdentityFile entries,
// ssh(1) tries them in order and simply SKIPS any entry it cannot use (e.g. a
// file that doesn't exist on disk), continuing until one identity
// authenticates. A bad entry never aborts the connection.
//
// Beekeeper must mimic this exactly. Today it does not: connection-provider
// copies the FIRST IdentityFile into ssh.privateKey, and tunnel.ts then
// readFileSync()s it unconditionally. If that first entry is missing the read
// throws ENOENT and the whole connection fails — even though the SSH agent
// holds a perfectly good key that OpenSSH would have used.
//
// This test sets up the exact OpenSSH-faithful scenario:
//   - a valid ed25519 key is loaded into a real ssh-agent and authorized on
//     the server,
//   - ~/.ssh/config lists a non-existent IdentityFile FIRST, then the valid
//     key second, with IdentitiesOnly yes.
// OpenSSH would skip the missing first entry and authenticate with the second.
// Beekeeper currently errors out on the bad first entry, so this test FAILS
// until the bug is fixed.

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

describe('SSH Tunnel Tests (skip bad ssh-config IdentityFile, #4366)', () => {
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

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-ssh-bad-entry-'))

    // The good identity: a real key that we load into the agent and authorize
    // on the server. This is the entry OpenSSH would fall through to.
    const goodKeyPath = path.join(workDir, 'id_ed25519')
    execSync(`ssh-keygen -t ed25519 -f "${goodKeyPath}" -N "" -q`)
    const goodPublicKey = fs.readFileSync(`${goodKeyPath}.pub`, 'utf-8').trim()

    const sock = path.join(workDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    execSync(`ssh-add "${goodKeyPath}"`, {
      env: { ...process.env, SSH_AUTH_SOCK: sock },
      stdio: 'pipe',
    })

    // Build a fake HOME whose ~/.ssh/config lists a BAD IdentityFile first
    // (a path that does not exist) followed by the GOOD key. IdentitiesOnly yes
    // mirrors the strict OpenSSH case where only the listed identities are
    // offered. OpenSSH skips the missing first entry and uses the second.
    const badKeyPath = path.join(workDir, 'does-not-exist')
    const fakeHome = path.join(workDir, 'home')
    fs.mkdirSync(path.join(fakeHome, '.ssh'), { recursive: true })
    fs.writeFileSync(
      path.join(fakeHome, '.ssh', 'config'),
      [
        'Host *',
        `  IdentityFile ${badKeyPath}`,
        `  IdentityFile ${goodKeyPath}`,
        '  IdentitiesOnly yes',
        '',
      ].join('\n'),
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
      `mkdir -p /config/.ssh && echo '${goodPublicKey}' >> /config/.ssh/authorized_keys && chmod 700 /config/.ssh && chmod 600 /config/.ssh/authorized_keys && chown -R abc:abc /config/.ssh`,
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
    it('should skip the missing first IdentityFile and authenticate with the next available identity', async () => {
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
