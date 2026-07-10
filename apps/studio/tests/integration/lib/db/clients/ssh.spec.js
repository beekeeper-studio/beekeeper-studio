import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as net from 'net'
import { DockerComposeEnvironment, GenericContainer, Wait } from 'testcontainers'
import { Server } from 'ssh2'
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';

// The none-auth test (#4358) reproduces an empty ssh-agent by pointing
// platform_info.sshAuthSock at an ephemeral agent socket. The other tests in
// this file use userpass mode, which never reads sshAuthSock, so the override
// (undefined until the none-auth test sets it) is a no-op for them.
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

describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let bastionContainer
  let connection
  let database
  let environment
  let jumpDatabase

  beforeAll(async () => {
    await TestOrmConnection.connect()

    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage("database system is ready to accept connections", 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .withWaitStrategy('test_ssh_jump1', Wait.forListeningPorts())
      .withWaitStrategy('test_ssh_bastion', Wait.forListeningPorts())
      .up()

    container = environment.getContainer('test_ssh')
    const jump1 = environment.getContainer('test_ssh_jump1')
    bastionContainer = environment.getContainer('test_ssh_bastion')

    // NB: postgres is on the private network only - no host port mapping.
    // It is only reachable via SSH tunnel through 'ssh' or through jump1 -> 'ssh'.

    // Direct SSH tunnel: test host -> ssh container -> postgres (private network)

    const config = {
      connectionType: 'postgresql',
      // postgres is reachable from the ssh container via the ssh_postgres network
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshConfigs: [
        {
          sshConfig: {
            host: container.getHost(),
            port: container.getMappedPort(2222),
            mode: 'userpass',
            username: 'beekeeper',
            password: 'password',
          },
        },
      ],
    }

    console.log("Starting SSH test with config", config)
    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()

    // Jump host chain: test host -> jump1 (public) -> ssh (private) -> postgres (private)
    // jump1 is the only container reachable from the test host.
    // ssh and postgres are on the private internal network only.
    const jumpConfig = {
      connectionType: 'postgresql',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshConfigs: [
        {
          position: 0,
          sshConfig: {
            host: jump1.getHost(),
            port: jump1.getMappedPort(2222),
            mode: 'userpass',
            username: 'beekeeper',
            password: 'password',
          },
        },
        {
          position: 1,
          sshConfig: {
            host: 'ssh',
            port: 2222,
            mode: 'userpass',
            username: 'beekeeper',
            password: 'password',
          },
        },
      ],
    }
    const jumpServer = ConnectionProvider.for(jumpConfig)
    jumpDatabase = jumpServer.createConnection('integration_test')
    await jumpDatabase.connect()
  })

  describe("Can SSH and run a query", () => {
    it("should work", async () => {
      const query = await database.query('select 1');
      await query.execute()
    })
  })

  describe("Can SSH through a jump host and run a query", () => {
    it("should run a query through a jump host chain", async () => {
      const query = await jumpDatabase.query('select 1')
      await query.execute()
    })
  })

  describe("Can SSH via bastion host and run a query", () => {
    let bastionDatabase

    beforeAll(async () => {
      const config = {
        connectionType: 'postgresql',
        // postgres is reachable from the ssh container via the ssh_postgres network
        host: 'postgres',
        port: 5432,
        username: 'postgres',
        password: 'example',
        sshEnabled: true,
        sshConfigs: [
          {
            // bastion is the only container reachable from the test runner via its mapped port
            position: 0,
            sshConfig: {
              host: bastionContainer.getHost(),
              port: bastionContainer.getMappedPort(2222),
              mode: 'userpass',
              username: 'beekeeper',
              password: 'password',
            },
          },
          {
            // ssh is reachable from the bastion container via the bastion_ssh network (by container name)
            position: 1,
            sshConfig: {
              host: 'test_ssh',
              port: 2222,
              mode: 'userpass',
              username: 'beekeeper',
              password: 'password',
            },
          },
        ],
      }

      const conn = ConnectionProvider.for(config)
      bastionDatabase = conn.createConnection('integration_test')
      await bastionDatabase.connect()
    })

    it("should work", async () => {
      const query = await bastionDatabase.query('select 1')
      await query.execute()
    })

    afterAll(async () => {
      if (bastionDatabase) {
        await bastionDatabase.disconnect()
      }
    })
  })

  afterAll(async () => {
    if (jumpDatabase) {
      await jumpDatabase.disconnect()
    }
    if (database) {
      await database.disconnect()
    }
    if (environment) {
      await environment.down()
    }
    await TestOrmConnection.disconnect()
  })
})

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

// Static ed25519 host key generated with `ssh-keygen -t ed25519`. We do NOT use
// ssh2's generateKeyPairSync here: it intermittently emits ed25519 keys that
// ssh2's own parseKey can't read (mscdex/ssh2#1390), which made this test flaky.
const HOST_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACC2lG8CqrSQ9fwwMqlCJXUPF1f0LhqVGwH6WFirTq/a2gAAAJhTilfNU4pX
zQAAAAtzc2gtZWQyNTUxOQAAACC2lG8CqrSQ9fwwMqlCJXUPF1f0LhqVGwH6WFirTq/a2g
AAAEB2Vg3yl/zjO5cnzVAtDwaYOijKRftatbamaYMey2PL/LaUbwKqtJD1/DAyqUIldQ8X
V/QuGpUbAfpYWKtOr9raAAAAEGJrcy10ZXN0LWZpeHR1cmUBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
`

// Minimal SSH server that authenticates with the `none` method only and proxies
// its direct-tcpip channels to the given TCP endpoint.
function startNoneAuthSshServer(dbHost, dbPort) {
  const server = new Server({ hostKeys: [HOST_KEY] }, (client) => {
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

  let container
  let sshServer
  let database
  let workDir
  let agentPid
  let originalHome

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
    const sshPort = sshServer.address().port

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
      await new Promise((resolve) => sshServer.close(() => resolve()))
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
    mockSshAuthSock = undefined
    await TestOrmConnection.disconnect()
  })
})
