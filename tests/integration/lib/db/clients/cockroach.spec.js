import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("CockroachDB Tests", () => {
  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)
    // environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
    // container = environment.getContainer("psql_1")

    container = await new GenericContainer("cockroachdb/cockroach")
      .withCmd("start --insecure")
      .withExposedPorts(26257)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'cockroachdb',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(26257),
      user: 'root',
      password: ''
    }
    util = new DBTestUtil(config, "defaultdb")
    await util.setupdb()

  })

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  it("Should pass standard tests", async () => {
    await util.testdb()
  })
})