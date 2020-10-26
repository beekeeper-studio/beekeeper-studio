import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("Postgres Tests", () => {

  let container;
  let util

  beforeAll(async () => {
    jest.setTimeout(dbtimeout)
    container = await new GenericContainer("postgres")
    .withName("testpostgres")
      .withEnv("POSTGRES_USER", "test")
      .withEnv("POSTGRES_PASSWORD", "test")
      .withEnv("POSTGRES_DB", "test")
      .withExposedPorts(5432)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    
    const config = {
      client: 'postgresql',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(5432),
      user: 'test',
      password: 'test'
    }
    util = new DBTestUtil(config, "test")
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