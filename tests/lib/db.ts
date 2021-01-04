import Knex from 'knex'
import { exit } from 'process'
import { IDbConnectionServerConfig } from '../../src/lib/db/client'
import { createServer } from '../../src/lib/db/index'
import log from 'electron-log'
import platformInfo from '../../src/common/platform_info'
export const dbtimeout = 120000


const KnexTypes: any = {
  postgresql: 'pg',
  'mysql': 'mysql2',
  "mariadb": "mysql2",
  "sqlite": "sqlite3",
  "sqlserver": "mssql",
  "cockroachdb": "pg"
}

interface Options {
  defaultSchema?: string
  version?: string,
  skipPkQuote?: boolean
}

export class DBTestUtil {
  public knex: Knex
  public server: any
  public connection: any
  public extraTables: number = 0
  private options: Options
  
  public preInitCmd: string | undefined
  public defaultSchema: string | null = 'public'
  
  get expectedTables() {
    return this.extraTables + 8
  }

  constructor(config: IDbConnectionServerConfig, database: string, options: Options = {}) {
    log.transports.console.level = 'error'  
    if (platformInfo.debugEnabled) {
      log.transports.console.level = 'silly'
    }
    this.options = options
    if (config.client === 'sqlite') {
      this.knex = Knex({
        client: "sqlite3",
        connection: {
          filename: database
        }
      })
    } else {
      this.knex = Knex({
        client: KnexTypes[config.client || ""] || config.client,
        version: options?.version,
        connection: {
          host: config.host,
          port: config.port || undefined,
          user: config.user || undefined,
          password: config.password || undefined,
          database,
        },
        pool: { min: 0, max: 50 }
      })
    }
    
    this.defaultSchema = options?.defaultSchema || this.defaultSchema
    this.server = createServer(config)
    this.connection = this.server.createConnection(database)
  }

  async setupdb() {
    await this.createTables()
    await this.connection.connect()
    const address = await this.knex("addresses").insert({country: "US"}).returning("id")
    const mixed = await this.knex("MixedCase").insert({bananas: "pears"}).returning("id")
    const people = await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0]}).returning("id")
    const jobs = await this.knex("jobs").insert({job_name: "Programmer"}).returning("id")
    await this.knex("people_jobs").insert({job_id: jobs[0], person_id: people[0] })
  }

  async testdb() {
    // SIMPLE TABLE CREATION TEST
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    console.log(tables)
    expect(tables.length).toBe(this.expectedTables)
    const columns = await this.connection.listTableColumns("people", this.defaultSchema)
    expect(columns.length).toBe(7)
    console.log("loading columns...")
    await this.tableViewTests()

    await this.queryTests()

  }

  /**
   * Tests related to the table view
   * fetching PK, selecting data, etc.
   */ 
  async tableViewTests() {

    console.log("table tests")
    // reserved word as table name
    expect(await this.connection.getPrimaryKey("group", this.defaultSchema))
      .toBe("id");
    
    expect(await this.connection.getPrimaryKey("MixedCase", this.defaultSchema))
      .toBe("id");
    
    const stR = await this.connection.selectTop("group", 0, 10, ["select"], null, this.defaultSchema)
    expect(stR)
      .toMatchObject({ result: [], totalRecords: 0 })
    
    await this.knex("group").insert([{select: "bar"}, {select: "abc"}])

    let r = await this.connection.selectTop("group", 0, 10, ["select"], null, this.defaultSchema)
    let result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(["abc", "bar"])

    r = await this.connection.selectTop("group", 0, 10, [{field: 'select', dir: 'desc'}], null, this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['bar', 'abc'])

    r = await this.connection.selectTop("group", 0, 1, [{ field: 'select', dir: 'desc' }], null, this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['bar'])

    r = await this.connection.selectTop("group", 1, 10, [{ field: 'select', dir: 'desc' }], null, this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['abc'])

    r = await this.connection.selectTop("MixedCase", 0, 1, [], null, this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(["pears"])

    // filter test - builder
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'desc' }], [{field: 'bananas', type: '=', value: "pears"}], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])

    // filter test - raw
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'desc' }], "bananas = 'pears'", this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])


    console.log("pk tests")
    // primary key tests
    let pk = await this.connection.getPrimaryKey("people", this.defaultSchema)
    expect(pk).toBe("id")

    if (!this.options.skipPkQuote) {
      console.log("quoted table PK")
      pk = await this.connection.getPrimaryKey("tablewith'char", this.defaultSchema)
      expect(pk).toBe("one")
    }

    // composite primary key tests. Just disable them for now
    r = await this.connection.getPrimaryKey('with_composite_pk', this.defaultSchema)
    expect(r).toBeNull()
  }

  async queryTests() {
    const q = await this.connection.query("select 1 as total, 2 as total")
    const result = await q.execute()
    // expect(result[0].rows).toMatchObject([{ total: 2 }])
    // expect(result).toMatchObject({ rows: [[1, 2]], fields: ['total', 'total']})
  }

  private async createTables() {

    await this.knex.schema.createTable('addresses', (table) => {
      table.increments().primary()
      table.timestamps()
      table.string("street")
      table.string("city")
      table.string("state")
      table.string("country").notNullable()
    })

    await this.knex.schema.createTable('MixedCase', (table) => {
      table.increments().primary()
      table.string("bananas")
    })

    await this.knex.schema.createTable('group', (table) => {
      table.increments().primary()
      table.string("select")
    })

    await this.knex.schema.createTable("people", (table) => {
      table.increments().primary()
      table.timestamps()
      table.string("firstname")
      table.string("lastname")
      table.string("email").notNullable()
      table.integer("address_id").notNullable().unsigned()
      table.foreign("address_id").references("addresses.id")
    })

    await this.knex.schema.createTable("jobs", (table) => {
      table.increments().primary()
      table.timestamps()
      table.string("job_name").notNullable()
      table.decimal("hourly_rate")
    })

    await this.knex.schema.createTable("people_jobs", (table) => {
      table.integer("person_id").notNullable().unsigned()
      table.integer("job_id").notNullable().unsigned()
      table.foreign("person_id").references("people.id")
      table.foreign("job_id").references("jobs.id")
      table.primary(['person_id', "job_id"])
      table.timestamps()
    })

    await this.knex.schema.createTable('with_composite_pk', (table) => {
      table.integer("id1").notNullable().unsigned()
      table.integer("id2").notNullable().unsigned()
      table.primary(["id1", "id2"])
    })

    await this.knex.schema.createTable("tablewith'char", (table) => {
      table.integer("one").unsigned().notNullable().primary()
    })
  }
}