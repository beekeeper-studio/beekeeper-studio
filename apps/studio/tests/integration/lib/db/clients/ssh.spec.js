import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '../../../../../src/lib/connection-provider';
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all';



describe("SSH Tunnel Tests", () => {
  let container;
  let connection
  let database
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)
    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy(Wait.forHealthCheck())
      .up()

    container = environment.getContainer('ssh_1')

    const db = environment.getContainer('postgres_1')



    jest.setTimeout(timeoutDefault)

    const quickConfig = {
      host: db.getContainerIpAddress(),
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
      sshHost: container.getContainerIpAddress(),
      sshPort: container.getMappedPort(2222),
      sshUsername: 'beekeeper',
      sshPassword: 'password'
    }

    const qc = ConnectionProvider.for(quickConfig)
    const qdb = qc.createConnection('integration_test')
    await qdb.connect()
    await qdb.query('select 1')

    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  describe("Can SSH and run a query", () => {
    it("should work", async () => {
      await database.query('select 1')
    } )
  })

  afterAll(async () => {
    if (database) {
      await database.disconnect()
    }
    if (environment) {
      await environment.stop()
    }
  })
})
