import knexlib from 'knex'
import { GenericContainer } from 'testcontainers'
import { createServer } from '../../../../../src/lib/db/index'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("Postgres Tests", () => {

  let container;
  let server;
  let connection;
  let knex;
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

    server = createServer(config)
    connection = server.createConnection("test")
    await connection.connect()
    knex = knexlib({client: 'pg'})
    util = new DBTestUtil(knex, connection)
    await util.setupdb()

  })

  afterAll(async() => {
    if (connection) {
      await connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  it("Should pass standard tests", async () => {
    await util.testdb()
  })
})