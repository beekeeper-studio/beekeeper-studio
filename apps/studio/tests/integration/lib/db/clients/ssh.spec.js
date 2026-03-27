import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';



describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let bastionContainer
  let connection
  let database
  let environment

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage("database system is ready to accept connections", 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .withWaitStrategy('test_ssh_bastion', Wait.forListeningPorts())
      .up()

    container = environment.getContainer('test_ssh')
    bastionContainer = environment.getContainer('test_ssh_bastion')

    jest.setTimeout(timeoutDefault)

    const config = {
      connectionType: 'postgresql',
      // postgres is reachable from the ssh container via the ssh_postgres network
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshMode: 'userpass',
      // ssh is directly reachable from the test runner via its mapped port
      sshHost: container.getHost(),
      sshPort: container.getMappedPort(2222),
      sshUsername: 'beekeeper',
      sshPassword: 'password'
    }

    console.log("Starting SSH test with config", config)
    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  describe("Can SSH and run a query", () => {
    it("should work", async () => {
      const query = await database.query('select 1');
      await query.execute()
    } )
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
        sshMode: 'userpass',
        // ssh is reachable from the bastion container via the bastion_ssh network (by container name)
        sshHost: 'test_ssh',
        sshPort: 2222,
        sshUsername: 'beekeeper',
        sshPassword: 'password',
        // bastion is the only container reachable from the test runner via its mapped port
        sshBastionHost: bastionContainer.getHost(),
        sshBastionHostPort: bastionContainer.getMappedPort(2222),
        sshBastionMode: 'userpass',
        sshBastionUsername: 'beekeeper',
        sshBastionPassword: 'password',
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
    if (database) {
      await database.disconnect()
    }
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })
})
