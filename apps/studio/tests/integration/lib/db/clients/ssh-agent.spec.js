// Regression test for https://github.com/beekeeper-studio/beekeeper-studio/issues/4193
//
// SSH Agent mode must succeed even when ssh.privateKey is set to a path that
// does not exist on disk. The connection-provider populates ssh.privateKey
// from the IdentityFile in ~/.ssh/config when sshMode === 'agent', and we
// must not try to read that file from disk in agent mode.

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as net from 'net'
import * as os from 'os'
import * as path from 'path'
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'

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

import connectTunnel from '@/lib/db/tunnel'

describe('SSH Tunnel agent mode (#4193)', () => {
  jest.setTimeout(dbtimeout)

  let environment
  let container
  let keyDir
  let agentPid
  let publicKey

  beforeAll(async () => {
    keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-ssh-agent-'))
    const keyPath = path.join(keyDir, 'id_ed25519')
    execSync(`ssh-keygen -t ed25519 -f "${keyPath}" -N "" -q`)
    publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf-8').trim()

    const sock = path.join(keyDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    execSync(`ssh-add "${keyPath}"`, {
      env: { ...process.env, SSH_AUTH_SOCK: sock },
      stdio: 'pipe',
    })

    environment = await new DockerComposeEnvironment('tests/docker', 'ssh.yml')
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .up(['ssh'])
    container = environment.getContainer('test_ssh')

    // Push the public key into the container's authorized_keys.
    // The linuxserver/openssh-server image creates the user under /config.
    await container.exec([
      'sh',
      '-c',
      `mkdir -p /config/.ssh && echo '${publicKey}' >> /config/.ssh/authorized_keys && chmod 700 /config/.ssh && chmod 600 /config/.ssh/authorized_keys && chown -R abc:abc /config/.ssh`,
    ])
  })

  afterAll(async () => {
    if (agentPid) {
      try { process.kill(agentPid) } catch (_e) { /* ignore */ }
    }
    if (keyDir && fs.existsSync(keyDir)) {
      fs.rmSync(keyDir, { recursive: true, force: true })
    }
    if (environment) {
      await environment.stop()
    }
  })

  it('opens a tunnel via SSH agent even when privateKey points to a non-existent file', async () => {
    const tunnelConfig = {
      client: 'postgresql',
      host: '127.0.0.1',
      port: 22,
      ssh: {
        host: container.getHost(),
        port: container.getMappedPort(2222),
        user: 'beekeeper',
        password: null,
        // Mimics connection-provider populating privateKey from ~/.ssh/config IdentityFile
        // when sshMode === 'agent'. Before #4193 was fixed, this caused ENOENT.
        privateKey: path.join(keyDir, 'does-not-exist'),
        passphrase: null,
        useAgent: true,
        bastionHost: null,
        bastionPort: null,
        bastionUser: null,
        bastionPassword: null,
        bastionPrivateKey: null,
        bastionPassphrase: null,
        bastionMode: null,
        keepaliveInterval: 0,
      },
    }

    const tunnel = await connectTunnel(tunnelConfig)
    try {
      expect(tunnel.localPort).toBeGreaterThan(0)

      // Verify the tunnel is actually listening locally; this proves the SSH
      // handshake completed via the agent.
      await new Promise((resolve, reject) => {
        const probe = net.connect(tunnel.localPort, tunnel.localHost, () => {
          probe.end()
          resolve()
        })
        probe.on('error', reject)
      })
    } finally {
      await tunnel.connection.shutdown()
    }
  })
})
