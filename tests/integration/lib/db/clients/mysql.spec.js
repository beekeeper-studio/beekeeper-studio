import knexlib from 'knex'
import { GenericContainer } from 'testcontainers'
import { createServer } from '../../../../../src/lib/db/index'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("MySQL Tests", () => {

  let container;
  let util

  beforeAll(async () => {
    jest.setTimeout(dbtimeout)
    container = await new GenericContainer("mysql")
    .withName("testmysql")
      .withEnv("MYSQL_ROOT_PASSWORD", "test")
      .withEnv("MYSQL_DATABASE", "test")
      .withExposedPorts(3306)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    
    const config = {
      client: 'mysql',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test'
    }
    util = new DBTestUtil(config, "test")
    connection = util.connection
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