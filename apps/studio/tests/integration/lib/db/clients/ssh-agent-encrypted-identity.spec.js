// Regression test for the encrypted default IdentityFile case.
//
// In agent mode with no IdentityFile configured, tunnel.ts falls back to the
// OpenSSH default identity files (~/.ssh/id_ed25519, etc). If that default key
// is passphrase-protected, it must NOT be loaded as sshConfig.privateKey: ssh2
// parses privateKey at connect() time and throws ("Encrypted private OpenSSH
// key detected, but no passphrase given") before any auth method runs, aborting
// the whole connection. The unlocked key already lives in the ssh-agent, so the
// encrypted default file should be skipped and authentication left to the agent.
//
// This test sets up that exact scenario:
//   - ~/.ssh/id_ed25519 exists but is ENCRYPTED (has a passphrase) and is NOT
//     authorized on the server,
//   - a separate, unencrypted key is loaded into a real ssh-agent and authorized
//     on the server,
//   - agent mode with no ~/.ssh/config IdentityFile entries.
// Beekeeper must skip the encrypted default key and authenticate via the agent.

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'

// findDefaultIdentityFile() (tunnel.ts) resolves ~/.ssh via os.homedir(). In
// this electron test runtime os.homedir() ignores a runtime $HOME override, so
// mock it to point at a throwaway fake home instead of the real ~/.ssh.
// var (not let): testcontainers calls os.homedir() at import time, before this
// initializes — var is hoisted as undefined so the mock falls back to the real
// homedir until the test assigns the fake one.
var mockHomedir
jest.mock('os', () => {
  const actual = jest.requireActual('os')
  return {
    ...actual,
    homedir: () => mockHomedir || actual.homedir(),
  }
})

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

describe('SSH Tunnel Tests (skip encrypted default IdentityFile in agent mode)', () => {
  jest.setTimeout(dbtimeout)

  let environment
  let container
  let database
  let connection
  let workDir
  let agentPid

  beforeAll(async () => {
    await TestOrmConnection.connect()

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-ssh-enc-id-'))

    // The good identity: an unencrypted key loaded into the agent and authorized
    // on the server. This is what the agent authenticates with.
    const agentKeyPath = path.join(workDir, 'agent_key')
    execSync(`ssh-keygen -t ed25519 -f "${agentKeyPath}" -N "" -q`)
    const agentPublicKey = fs.readFileSync(`${agentKeyPath}.pub`, 'utf-8').trim()

    const sock = path.join(workDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    execSync(`ssh-add "${agentKeyPath}"`, {
      env: { ...process.env, SSH_AUTH_SOCK: sock },
      stdio: 'pipe',
    })

    // Fake home whose ~/.ssh/id_ed25519 is the OpenSSH default identity file but
    // is passphrase-protected. There is no ssh config, so no IdentityFile is
    // configured and tunnel.ts falls back to this default key. It is NOT
    // authorized on the server; it must be skipped rather than loaded as
    // privateKey (which would make connect() throw on the encrypted key).
    const fakeHome = path.join(workDir, 'home')
    fs.mkdirSync(path.join(fakeHome, '.ssh'), { recursive: true })
    const defaultKeyPath = path.join(fakeHome, '.ssh', 'id_ed25519')
    execSync(`ssh-keygen -t ed25519 -f "${defaultKeyPath}" -N "hunter2-passphrase" -q`)
    mockHomedir = fakeHome

    environment = await new DockerComposeEnvironment('tests/docker', 'ssh.yml')
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage('database system is ready to accept connections', 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .up(['postgres', 'ssh'])

    container = environment.getContainer('test_ssh')

    await container.exec([
      'sh',
      '-c',
      `mkdir -p /config/.ssh && echo '${agentPublicKey}' >> /config/.ssh/authorized_keys && chmod 700 /config/.ssh && chmod 600 /config/.ssh/authorized_keys && chown -R abc:abc /config/.ssh`,
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
    it('should skip the encrypted default identity file and authenticate via the agent', async () => {
      const query = await database.query('select 1')
      await query.execute()
    })
  })

  afterAll(async () => {
    // Guard each step: when the connection fails (the bug under test)
    // disconnect() throws, and the agent/containers still need tearing down.
    if (database) {
      try { await database.disconnect() } catch (_e) { /* ignore */ }
    }
    if (environment) {
      try { await environment.stop() } catch (_e) { /* ignore */ }
    }
    if (agentPid) {
      try { process.kill(agentPid) } catch (_e) { /* ignore */ }
    }
    if (workDir && fs.existsSync(workDir)) {
      try { fs.rmSync(workDir, { recursive: true, force: true }) } catch (_e) { /* ignore */ }
    }
    await TestOrmConnection.disconnect()
  })
})
