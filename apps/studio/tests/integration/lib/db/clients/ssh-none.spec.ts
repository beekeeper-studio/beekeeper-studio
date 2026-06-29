// Regression test for https://github.com/beekeeper-studio/beekeeper-studio/issues/4358
//
// SSH tunnels stopped working for "none"-auth servers in v5.8.0. Some SSH
// servers (Tailscale's embedded SSH being the motivating case) authenticate the
// caller out of band and accept the SSH "none" auth method -- no key or password
// is offered. v5.8.0 (commit 3c8a0913) began passing ssh2 an explicit
// authHandler built from the chosen mode. In Automatic/agent mode that list was
// just ['agent']; when the ssh-agent holds no usable key -- the normal case for
// such a server, where the user has no key for the host -- ssh2 exhausts the
// agent with no successful attempt and, because 'none' was never offered, fails
// with "All configured authentication methods failed". The fix (tunnel.ts
// buildAuthHandler) always offers 'none' as a fallback.
//
// The regression is purely client-side, so this test does not need a real
// tailnet -- any SSH server that accepts `none` proves it. We stand up a minimal
// in-process ssh2 server that accepts only `none` and forwards its direct-tcpip
// channel to a postgres container. The empty ssh-agent (no `ssh-add`) is the
// crux: it makes the test RED on the pre-fix ['agent']-only handler and GREEN
// once 'none' is offered.

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as net from 'net'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import { Server, utils } from 'ssh2'
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'

let mockSshAuthSock: string
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

// Minimal SSH server that authenticates with the `none` method only and proxies
// its direct-tcpip channels to the given TCP endpoint.
function startNoneAuthSshServer(dbHost: string, dbPort: number): Promise<Server> {
  const hostKey = utils.generateKeyPairSync('ed25519').private
  const server = new Server({ hostKeys: [hostKey] }, (client) => {
    client.on('authentication', (ctx) => {
      if (ctx.method === 'none') ctx.accept()
      else ctx.reject(['none'])
    })
    client.on('ready', () => {
      client.on('session', (accept) => { accept() })
      // direct-tcpip: forward the SSH stream to the database with a plain socket
      client.on('tcpip', (accept, reject) => {
        const socket = net.connect(dbPort, dbHost, () => {
          const stream = accept()
          socket.pipe(stream).pipe(socket)
        })
        socket.on('error', () => { try { reject() } catch { /* already handled */ } })
      })
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

describe('SSH Tunnel Tests (none auth, #4358)', () => {
  jest.setTimeout(dbtimeout)

  let container: StartedTestContainer
  let sshServer: Server
  let database: any
  let workDir: string
  let agentPid: number | undefined
  let originalHome: string | undefined

  beforeAll(async () => {
    await TestOrmConnection.connect()

    // Ephemeral ssh-agent with NO keys added. The empty agent is the crux of
    // #4358: agent mode forces authHandler to include 'agent', but the agent
    // offers nothing, so without a 'none' fallback the tunnel can never connect.
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-ssh-none-'))
    const sock = path.join(workDir, 'agent.sock')
    const agentOut = execSync(`ssh-agent -a "${sock}"`).toString()
    const m = agentOut.match(/SSH_AGENT_PID=(\d+)/)
    if (!m) throw new Error(`Failed to start ssh-agent: ${agentOut}`)
    agentPid = Number(m[1])
    mockSshAuthSock = sock

    // Empty fake HOME so connection-provider's ~/.ssh/config lookup is a no-op.
    const fakeHome = path.join(workDir, 'home')
    fs.mkdirSync(path.join(fakeHome, '.ssh'), { recursive: true })
    originalHome = process.env.HOME
    process.env.HOME = fakeHome

    container = await new GenericContainer('postgres:13')
      .withEnvironment({
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'example',
        POSTGRES_DB: 'integration_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .withStartupTimeout(dbtimeout)
      .start()

    const dbHost = container.getHost()
    const dbPort = container.getMappedPort(5432)

    sshServer = await startNoneAuthSshServer(dbHost, dbPort)
    const sshPort = (sshServer.address() as net.AddressInfo).port

    const config = {
      connectionType: 'postgresql',
      host: dbHost,
      port: dbPort,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshMode: 'agent', // empty agent → reproduces #4358
      sshHost: '127.0.0.1',
      sshPort,
      sshUsername: 'root',
    }

    const connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  it('connects through a none-auth SSH tunnel and runs a query', async () => {
    const query = await database.query('select 1')
    const result = await query.execute()
    expect(result).toBeTruthy()
  })

  afterAll(async () => {
    if (database) {
      try { await database.disconnect() } catch { /* ignore */ }
    }
    if (sshServer) {
      await new Promise<void>((resolve) => sshServer.close(() => resolve()))
    }
    if (container) {
      await container.stop()
    }
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
    if (agentPid) {
      try { process.kill(agentPid) } catch { /* ignore */ }
    }
    if (workDir && fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true })
    }
    await TestOrmConnection.disconnect()
  })
})
