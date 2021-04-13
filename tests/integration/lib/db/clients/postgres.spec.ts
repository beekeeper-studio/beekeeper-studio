import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"
import { itShouldInsertGoodData, itShouldNotInsertBadData, itShouldApplyAllTypesOfChanges, itShouldNotCommitOnChangeError } from './all'
import { IDbConnectionServerConfig } from '@/lib/db/client'

describe("Postgres Integration Tests", () => {
  let container: StartedTestContainer;
  let util: DBTestUtil

  const names = [
    { name: "Matthew" },
    { name: "Nicoll" },
    { name: "Gregory" },
    { name: "Alex" },
    { name: "Alethea" },
    { name: "Elias" }
  ]

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
      const config: IDbConnectionServerConfig = {
        client: 'postgresql',
        host: container.getContainerIpAddress(),
        port: container.getMappedPort(5432),
        user: 'postgres',
        password: 'example',
        osUser: 'foo',
        ssh: null,
        sslCaFile: null,
        sslCertFile: null,
        sslKeyFile: null,
        sslRejectUnauthorized: false,
        ssl: false,
        domain: null,
        socketPath: null,
      }
      util = new DBTestUtil(config, "banana")
      await util.setupdb()

      await util.knex.schema.createTable('streamtest', (table) => {
        table.increments().primary()
        table.string("name")
      })

      await util.knex.schema.createTable('witharrays', (table) => {
        table.integer("id").primary()
        table.specificType('names', 'TEXT []')
        table.text("normal")
      })


      await util.knex('streamtest').insert(names)

      await util.knex("witharrays").insert({ id: 1, names: ['a', 'b', 'c'], normal: 'foo' })

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
    const result = await util.connection.applyChanges({ updates, inserts: [], deletes: [] })
    expect(result).toMatchObject([{id: 1, names: ['x', 'y', 'z'], normal: 'Bananas'}])
  })

  it("Should insert good data", async () => {
    await itShouldInsertGoodData(util)
  })

  it("Should not insert bad data", async() => {
    await itShouldNotInsertBadData(util)
  })

  it("Should apply all types of changes", async() => {
    await itShouldApplyAllTypesOfChanges(util)
  })

  it("Should not commit on change error", async() => {
    await itShouldNotCommitOnChangeError(util)
  })

  it("should allow selects with streams", async() => {
    const result = await util.connection.selectTopStream(
      'streamtest',
      [{ field: 'id', dir: 'ASC'}],
      []
    )
    expect(result.fields).toMatchObject(['id', 'name'])
    expect(result.totalRows).toBe(6)
    const cursor = result.cursor
    await cursor.start()
    const b1 = await cursor.read(5)
    expect(b1.length).toBe(5)
    expect(b1.map(r => r.name)).toMatchObject(names.map(r => r.name).slice(0, 5))
    const b2 = await cursor.read(5)
    expect(b2.length).toBe(1)
    expect(b2[0].name).toBe(names[names.length - 1].name)

    const b3 = await cursor.read(5)
    expect(b3).toMatchObject([])
    await cursor.close()

  })
})
