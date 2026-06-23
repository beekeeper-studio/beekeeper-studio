import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';

// Verifies that MongoDB connections work through an SSH tunnel. The mongo
// container is only reachable from the ssh container (the ssh_mongo network),
// so the connection can only succeed if the tunnel is established and the
// MongoDB URL is rewritten to point at the tunnel's local endpoint.
describe("MongoDB SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let sshContainer
  let connection
  let database
  let environment

  beforeAll(async () => {
    await TestOrmConnection.connect()

    environment = await new DockerComposeEnvironment("tests/docker", "ssh-mongo.yml")
      .withWaitStrategy('test_ssh_mongo', Wait.forListeningPorts())
      .withWaitStrategy('test_ssh_mongo_gateway', Wait.forListeningPorts())
      .up()

    sshContainer = environment.getContainer('test_ssh_mongo_gateway')

    const config = {
      connectionType: 'mongodb',
      // mongo is reachable from the ssh container via the ssh_mongo network (by container name)
      url: 'mongodb://beekeeper:password@mongo:27017/bee?authSource=admin',
      sshEnabled: true,
      sshMode: 'userpass',
      // ssh is directly reachable from the test runner via its mapped port
      sshHost: sshContainer.getHost(),
      sshPort: sshContainer.getMappedPort(2222),
      sshUsername: 'beekeeper',
      sshPassword: 'password',
    }

    console.log("Starting MongoDB SSH test with config", config)
    connection = ConnectionProvider.for(config)
    database = connection.createConnection('bee')
    await database.connect()
  })

  it("should connect and read the server version through the tunnel", async () => {
    const version = await database.versionString()
    expect(version).toBeTruthy()
  })

  it("should list tables through the tunnel", async () => {
    const tables = await database.listTables()
    expect(Array.isArray(tables)).toBe(true)
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
