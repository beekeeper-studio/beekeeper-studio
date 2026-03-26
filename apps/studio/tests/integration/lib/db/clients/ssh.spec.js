import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';



describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
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
      .up()

    container = environment.getContainer('test_ssh')
    const jump1 = environment.getContainer('test_ssh_jump1')

    // NB: postgres is on the private network only - no host port mapping.
    // It is only reachable via SSH tunnel through 'ssh' or through jump1 -> 'ssh'.

    // Direct SSH tunnel: test host -> ssh container -> postgres (private network)
    const config = {
      connectionType: 'postgresql',
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

  afterAll(async () => {
    if (jumpDatabase) {
      await jumpDatabase.disconnect()
    }
    if (database) {
      await database.disconnect()
    }
    if (container) {
      await container.stop()
    }
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })
})
