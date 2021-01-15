import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("Postgres Integration Tests", () => {
  let container;
  let util

  beforeAll(async () => {
    try {
      const timeoutDefault = 5000
      jest.setTimeout(dbtimeout)
      // environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
      // container = environment.getContainer("psql_1")
  
      container = await new GenericContainer("postgres")
        .withEnv("POSTGRES_PASSWORD", "example")
        .withEnv("POSTGRES_DB", "banana")
        .withExposedPorts(5432)
        .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
        .start()
      jest.setTimeout(timeoutDefault)
      const config = {
        client: 'postgresql',
        host: container.getContainerIpAddress(),
        port: container.getMappedPort(5432),
        user: 'postgres',
        password: 'example'
      }
      util = new DBTestUtil(config, "banana")
      await util.setupdb()

    } catch (ex) {
      console.log("ERROR")
      console.log(ex)
    }
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

  it("Should allow me to update rows with array types", async () => {
    await util.knex.schema.createTable('witharrays', (table) => {
      table.integer("id").primary()
      table.specificType('names', 'TEXT []')
      table.text("normal")
    })

    await util.knex("witharrays").insert({ id: 1, names: ['a', 'b', 'c'], normal: 'foo' })

    const updates = [{
      value: '["x", "y", "z"]',
      column: "names",
      pkColumn: "id",
      primaryKey: 1,
      columnType: "_text",
      table: "witharrays",
    },
    {
      value: 'Bananas',
      table: 'witharrays',
      column: 'normal',
      primaryKey: 1,
      columnType: 'text',
      pkColumn: 'id'
    }
  ]
    const result = await util.connection.updateValues(updates)
    expect(result).toMatchObject([{id: 1, names: ['x', 'y', 'z'], normal: 'Bananas'}])
  })
})
