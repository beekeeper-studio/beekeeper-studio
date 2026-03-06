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

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage("database system is ready to accept connections", 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .up()

    container = environment.getContainer('test_ssh')

    const db = environment.getContainer('test_ssh_postgres')

    jest.setTimeout(timeoutDefault)

    const quickConfig = {
      host: db.getHost(),
      port: db.getMappedPort(5432),
      username: 'postgres',
      password: 'example',
      connectionType: 'postgresql'
    }

    // NB: If this fails it's due to ipv4 vs ipv6 mixup.
    // as of Node 17+ DNS defaults to v6 instead of v4.
    let host = container.getHost()
    const config = {
      connectionType: 'postgresql',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshHost: container.getHost(),
      sshPort: container.getMappedPort(2222),
      sshUsername: 'beekeeper',
      sshPassword: 'password'
    }

    const qc = ConnectionProvider.for(quickConfig)
    const qdb = qc.createConnection('integration_test')
    await qdb.connect()
    const query = await qdb.query('select 1');
    await query.execute()
    await qdb.disconnect();

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

  afterAll(async () => {
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
