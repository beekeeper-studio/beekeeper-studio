import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '../../../../../src/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'



describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let connection
  let database
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy(Wait.forHealthCheck())
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
  })
})
