import { GenericContainer, Wait, DockerComposeEnvironment } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("Postgres Tests", () => {
  let environment;
  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)
    // environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
    // container = environment.getContainer("psql_1")
    async function sleep(ms) {
      await _sleep(ms);
    }

    function _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    container = await new GenericContainer("postgres")
      .withEnv("POSTGRES_PASSWORD", "example")
      .withEnv("POSTGRES_DB", "banana")
      .withExposedPorts(5432)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    jest.setTimeout(timeoutDefault)
    await sleep(5000)
    const config = {
      client: 'postgresql',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(5432),
      user: 'postgres',
      password: 'example'
    }
    util = new DBTestUtil(config, "banana")
    await util.setupdb()

  })

  afterAll(async() => {
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