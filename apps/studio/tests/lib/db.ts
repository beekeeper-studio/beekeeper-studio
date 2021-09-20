import Knex from 'knex'
import { DBConnection, IDbConnectionServerConfig } from '../../src/lib/db/client'
import { createServer } from '../../src/lib/db/index'
import log from 'electron-log'
import platformInfo from '../../src/common/platform_info'
import { IDbConnectionPublicServer } from '@/lib/db/server'
import { AlterTableSpec, Dialect, DialectData } from '../../../../shared/src/lib/dialects/models'
import { getDialectData } from '../../../../shared/src/lib/dialects/'
import _ from 'lodash'
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
  dialect: Dialect,
  defaultSchema?: string
  version?: string,
  skipPkQuote?: boolean
}

export class DBTestUtil {
  public knex: Knex
  public server: IDbConnectionPublicServer
  public connection: DBConnection
  public extraTables: number = 0
  private options: Options
  private dbType: string

  private dialect: Dialect
  private data: DialectData
  
  public preInitCmd: string | undefined
  public defaultSchema: string = 'public'
  
  get expectedTables() {
    return this.extraTables + 8
  }

  constructor(config: IDbConnectionServerConfig, database: string, options: Options) {
    log.transports.console.level = 'error'  
    if (platformInfo.debugEnabled) {
      log.transports.console.level = 'silly'
    }

    this.dialect = options.dialect
    this.data = getDialectData(this.dialect)
    this.dbType = config.client || 'generic'
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
    await this.connection.connect()
    await this.createTables()
    const address = await this.knex("addresses").insert({country: "US"}).returning("id")
    await this.knex("MixedCase").insert({bananas: "pears"}).returning("id")
    const people = await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0]}).returning("id")
    const jobs = await this.knex("jobs").insert({job_name: "Programmer"}).returning("id")
    await this.knex("people_jobs").insert({job_id: jobs[0], person_id: people[0] })
  }

  testdb() {

  }

  async listTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    expect(tables.length).toBeGreaterThanOrEqual(this.expectedTables)
    const columns = await this.connection.listTableColumns("people", this.defaultSchema)
    expect(columns.length).toBe(7)
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
    
    const stR = await this.connection.selectTop("group", 0, 10, [{ field: "select", dir: 'ASC'} ], [], this.defaultSchema)
    expect(stR)
      .toMatchObject({ result: [] })
    
    await this.knex("group").insert([{select: "bar"}, {select: "abc"}])

    let r = await this.connection.selectTop("group", 0, 10, [{field: "select", dir: 'ASC'}], [], this.defaultSchema)
    let result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(["abc", "bar"])

    r = await this.connection.selectTop("group", 0, 10, [{field: 'select', dir: 'DESC'}], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['bar', 'abc'])

    r = await this.connection.selectTop("group", 0, 1, [{ field: 'select', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['bar'])

    r = await this.connection.selectTop("group", 1, 10, [{ field: 'select', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select)
    expect(result).toMatchObject(['abc'])

    r = await this.connection.selectTop("MixedCase", 0, 1, [], [], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(["pears"])
  }

  async alterTableTests() {

    await this.knex.schema.dropTableIfExists("alter_test")
    await this.knex.schema.createTable("alter_test", (table) => {
      table.specificType("id", 'varchar(255)').notNullable()
      table.specificType("first_name", "varchar(255)").nullable()
      table.specificType("last_name", "varchar(255)").notNullable().defaultTo('Rathbone')
      table.specificType("age", "varchar(255)").defaultTo('8').nullable()
    })


    const simpleChange = {
      table: 'alter_test',
      alterations: [
        {
          'columnName': 'last_name',
          changeType: 'columnName',
          newValue: 'family_name'
        }
      ]
    }

    await this.connection.alterTable(simpleChange)
    const simpleResult = await this.connection.listTableColumns('alter_test')

    console.log(simpleResult)
    expect(simpleResult.find((c) => c.columnName === 'family_name')).toBeTruthy()


    // only databases that can actually change things past this point.
    if (this.data.disabledFeatures?.alter?.alterColumn) return

    await this.knex.schema.dropTableIfExists("alter_test")
    await this.knex.schema.createTable("alter_test", (table) => {
      table.specificType("id", 'varchar(255)').notNullable()
      table.specificType("first_name", "varchar(255)").nullable()
      table.specificType("last_name", "varchar(255)").notNullable().defaultTo('Rath\'bone')
      table.specificType("age", "varchar(255)").defaultTo('8').nullable()
    })



    const input: AlterTableSpec = {
      table: 'alter_test',
      alterations: [
        {
          columnName: 'last_name',
          changeType: 'columnName',
          newValue: 'family_name'
        },
        {
          columnName: 'first_name',
          changeType: 'dataType',
          newValue: 'varchar(20)'
        },
        {
          columnName: 'first_name',
          changeType: 'defaultValue',
          newValue: "'Foo''bar'"
        },
        {
          columnName: 'age',
          changeType: 'nullable',
          newValue: false
        },
        {
          columnName: 'age',
          changeType: 'defaultValue',
          newValue: '99'
        },
        {
          columnName: 'age',
          changeType: 'dataType',
          newValue: 'varchar(5)'
        }
      ]
    }

    await this.connection.alterTable(input)
    const schema = await this.connection.listTableColumns('alter_test')
    interface MiniColumn {
      columnName: string
      dataType: string,
      nullable: boolean,
      defaultValue: string,
    }
    const rawResult: MiniColumn[] = schema.map((c) => 
      _.pick(c, 'nullable', 'defaultValue', 'columnName', 'dataType')
    )
    

    // cockroach adds a rowid column if there's no primary key.
    const result = rawResult.filter((r) => r.columnName !== 'rowid')


    // this is different in each database.
    const defaultValue = (s: any) => {
      if (this.dialect === 'postgresql' && _.isNumber(s)) return s.toString()
      if (this.dialect === 'postgresql') return `'${s.replaceAll("'", "''")}'::character varying`
      if (this.dialect === 'sqlserver' && _.isNumber(s)) return `((${s}))`
      if (this.dialect === 'sqlserver') return `('${s.replaceAll("'", "''")}')`
      return s.toString()
    }
    const expected = [
      {
        columnName: 'id',
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: null,
      },
      {
        columnName: 'first_name',
        dataType: 'varchar(20)',
        nullable: true,
        defaultValue: defaultValue("Foo'bar"),
      },
      {
        columnName: 'family_name',
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: defaultValue('Rath\'bone'),
      },
      {
        columnName: 'age',
        dataType: 'varchar(5)',
        nullable: false,
        defaultValue: defaultValue(99),
      }
    ]
    expect(result).toMatchObject(expected)
    
  }

  async filterTests() {
    // filter test - builder
    let r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: '=', value: "pears" }], this.defaultSchema)
    let result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])

    // filter test - raw
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], "bananas = 'pears'", this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])
  }

  async primaryKeyTests() {
    // primary key tests
    let pk = await this.connection.getPrimaryKey("people", this.defaultSchema)
    expect(pk).toBe("id")

    if (!this.options.skipPkQuote) {
      pk = await this.connection.getPrimaryKey("tablewith'char", this.defaultSchema)
      expect(pk).toBe("one")
    }

    // composite primary key tests. Just disable them for now
    const pkres = await this.connection.getPrimaryKey('with_composite_pk', this.defaultSchema)
    expect(pkres).toBeNull()
  }

  async queryTests() {
    if (this.dbType === 'sqlite') return
    console.log('query tests')
    const q = await this.connection.query("select 'a' as total, 'b' as total")
    if(!q) throw new Error("no query result")
    const result = await q.execute()

    expect(result[0].rows).toMatchObject([{ c0: "a", c1: "b" }])
    const fields = result[0].fields.map((f: any) => ({id: f.id, name: f.name}))
    expect(fields).toMatchObject([{id: 'c0', name: 'total'}, {id: 'c1', name: 'total'}])

    const q2 = await this.connection.query("select 'a' as a; select 'b' as b");
    if (!q2) throw "No query result"
    const r2 = await q2.execute()
    expect(r2[0].rows).toMatchObject([{c0: "a"}])
    expect(r2[1].rows).toMatchObject([{c0: 'b'}])
    expect(r2[0].fields.map((f: any) => [f.id, f.name])).toMatchObject([['c0', 'a']])
    expect(r2[1].fields.map((f: any) => [f.id, f.name])).toMatchObject([['c0', 'b']])

  }

  // lets start simple, it should resolve for all connection types
  async tablePropertiesTests() {
    await this.connection.getTableProperties('group', this.defaultSchema)

    if (!this.data.disabledFeatures.createIndex) {
      const indexes = await this.connection.listTableIndexes('has_index', this.defaultSchema)
      const names = indexes.map((i) => i.name)
      expect(names).toContain('has_index_foo_idx')
    }
  }

  async streamTests() {
    console.log('selectTopStream tests')
    const names = [
      { name: "Matthew" },
      { name: "Nicoll" },
      { name: "Gregory" },
      { name: "Alex" },
      { name: "Alethea" },
      { name: "Elias" }
    ]
    await this.knex.schema.createTable('streamtest', (table) => {
      table.increments().primary()
      table.string("name")
    })

    await this.knex('streamtest').insert(names)
    const result = await this.connection.selectTopStream(
      'streamtest',
      [{ field: 'id', dir: 'ASC' }],
      [],
      5,
      undefined,
    )
    console.log("checking columns and total row count")
    expect(result.columns.map(c => c.columnName)).toMatchObject(['id', 'name'])
    expect(result.totalRows).toBe(6)
    const cursor = result.cursor
    console.log("starting cursor")
    await cursor.start()
    console.log("length?")
    const b1 = await cursor.read()
    expect(b1.length).toBe(5)
    console.log("reading first five names and checking those")
    console.log(b1)
    expect(b1.map(r => r[1])).toMatchObject(names.map(r => r.name).slice(0, 5))
    console.log("read2")
    const b2 = await cursor.read()
    expect(b2.length).toBe(1)
    expect(b2[0][1]).toBe(names[names.length - 1].name)
    console.log("read 3")
    const b3 = await cursor.read()
    expect(b3).toMatchObject([])
    console.log("closing")
    await cursor.close()


    
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

    await this.knex.schema.createTable('has_index', (table) => {
      table.integer('foo')
      if (!this.data.disabledFeatures.createIndex) {
        table.index('foo', 'has_index_foo_idx')
      }
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