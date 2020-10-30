import Knex from 'knex'
import { IDbConnectionServerConfig } from '../../src/lib/db/client'
import { createServer } from '../../src/lib/db/index'


export const dbtimeout = 120000

const KnexTypes: any = {
  postgresql: 'pg',
  'mysql': 'mysql2',
  "mariadb": "mysql2",
  "sqlite": "sqlite3",
  "sqlserver": "mssql"
}

export class DBTestUtil {
  public knex: Knex
  public server: any
  public connection: any
  public expectedTables: number = 5
  constructor(config: IDbConnectionServerConfig, database: string) {

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
        connection: {
          host: config.host,
          port: config.port || undefined,
          user: config.user || undefined,
          password: config.password || undefined,
          database
        }
      })
    }

    this.server = createServer(config)
    this.connection = this.server.createConnection(database)
  }

  async setupdb() {
    await this.connection.connect()
    await this.createTables()
    const address = await this.knex("addresses").insert({country: "US", id: 1}).returning("id")
    const people = await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0]}).returning("id")
    const jobs = await this.knex("jobs").insert({job_name: "Programmer"}).returning("id")
    await this.knex("people_jobs").insert({job_id: jobs[0], person_id: people[0] })
  }

  async testdb() {
    // SIMPLE TABLE CREATION TEST
    const tables = await this.connection.listTables({ schema: "public" })
    expect(tables.length).toBe(this.expectedTables)
    const columns = await this.connection.listTableColumns("people", "public")
    expect(columns.length).toBe(7)

    // PRIMARY KEY TESTS
    // TODO: update this to support composite keys
    const pk = await this.connection.getPrimaryKey("people", "public")
    expect(pk).toBe("id")

    await this.tableViewTests()

  }

  /**
   * Tests related to the table view
   * fetching PK, selecting data, etc.
   */ 
  async tableViewTests() {
    // reserved word as table name
    expect(await this.connection.getPrimaryKey("group", "public"))
      .toBe("id");
    
    expect(await this.connection.selectTop("group", 0, 10, ["select"]))
      .toStrictEqual({ "result": [], "totalRecords": 0 })
    
    await this.knex("group").insert([{select: "bar"}, {select: "abc"}])

    let r = await this.connection.selectTop("group", 0, 10, ["select"])
    let result = r.result.map((r: any) => r.select)
    expect(result).toStrictEqual(["abc", "bar"])

    r = await this.connection.selectTop("group", 0, 10, [{field: 'select', dir: 'desc'}])
    result = r.result.map((r: any) => r.select)
    expect(result).toStrictEqual(['bar', 'abc'])

    r = await this.connection.selectTop("group", 0, 1, [{ field: 'select', dir: 'desc' }])
    result = r.result.map((r: any) => r.select)
    expect(result).toStrictEqual(['bar'])

    r = await this.connection.selectTop("group", 1, 10, [{ field: 'select', dir: 'desc' }])
    result = r.result.map((r: any) => r.select)
    expect(result).toStrictEqual(['abc'])
    

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
  }
}