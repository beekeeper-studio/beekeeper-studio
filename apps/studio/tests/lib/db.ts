import {Knex} from 'knex'
import knex from 'knex'
import { DBConnection, IDbConnectionServerConfig } from '../../src/lib/db/client'
import { createServer } from '../../src/lib/db/index'
import log from 'electron-log'
import platformInfo from '../../src/common/platform_info'
import { IDbConnectionPublicServer } from '../../src/lib/db/server'
import { AlterTableSpec, Dialect, DialectData } from '../../../../shared/src/lib/dialects/models'
import { getDialectData } from '../../../../shared/src/lib/dialects/'
import _ from 'lodash'
import { TableIndex } from '../../src/lib/db/models'
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
  public data: DialectData

  public preInitCmd: string | undefined
  public defaultSchema: string = undefined

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
      this.knex = knex({
        client: "better-sqlite3",
        connection: {
          filename: database
        }
      })
    } else {
      this.knex = knex({
        client: KnexTypes[config.client || ""] || config.client,
        version: options?.version,
        connection: {
          host: config.socketPathEnabled ? undefined : config.host,
          socketPath: config.socketPathEnabled ? config.socketPath : undefined,
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

  maybeArrayToObject(items, key) {
    return items.map((item) => {
      if(_.isObject(item)) return item
      const result = {}
      result[key] = item
      return result
    })
  }

  async setupdb() {
    await this.connection.connect()
    await this.createTables()
    const address = this.maybeArrayToObject(await this.knex("addresses").insert({country: "US"}).returning("id"), 'id')
    await this.knex("MixedCase").insert({bananas: "pears"}).returning("id")
    const people = this.maybeArrayToObject(await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0].id}).returning("id"), 'id')
    const jobs = this.maybeArrayToObject(await this.knex("jobs").insert({job_name: "Programmer"}).returning("id"), 'id')
    await this.knex("people_jobs").insert({job_id: jobs[0].id, person_id: people[0].id })
  }

  testdb() {

  }

  async listTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    expect(tables.length).toBeGreaterThanOrEqual(this.expectedTables)
    const columns = await this.connection.listTableColumns("people", this.defaultSchema)
    expect(columns.length).toBe(7)
  }


  async tableColumnsTests() {
    const columns = await this.connection.listTableColumns(null, this.defaultSchema)
    const groupColumns = columns.filter((row) => row.tableName === 'group')
    expect(groupColumns.length).toBe(2)
  }

  /**
   * Tests related to the table view
   * fetching PK, selecting data, etc.
   */
  async tableViewTests() {

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

  async triggerTests() {
    // it should just complete without erroring
    await this.connection.listTableTriggers("MixedCase", this.defaultSchema)
  }

  async primaryKeyTests() {
    // primary key tests
    let pk = await this.connection.getPrimaryKey("people", this.defaultSchema)
    expect(pk).toBe("id")

    if (!this.options.skipPkQuote) {
      pk = await this.connection.getPrimaryKey("tablewith'char", this.defaultSchema)
      expect(pk).toBe("one")
    }

    const rawPkres = await this.connection.getPrimaryKeys('with_composite_pk', this.defaultSchema)
    const pkres = rawPkres.map((key) => key.columnName);
    expect(pkres).toEqual(expect.arrayContaining(["id1", "id2"]))
  }

  async queryTests() {
    if (this.dbType === 'sqlite') return
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

  async getInsertQueryTests() {
    const row = { job_name: "Programmer", hourly_rate: 41 }
    const tableInsert = { table: 'jobs', schema: this.defaultSchema, data: [row] }
    const insertQuery = await this.connection.getInsertQuery(tableInsert)
    const expectedQueries = {
      postgresql: `insert into "public"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
      mysql: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      mariadb: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      sqlite: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      sqlserver: "insert into [dbo].[jobs] ([hourly_rate], [job_name]) values (41, 'Programmer')",
      cockroachdb: `insert into "public"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`
    }

    expect(insertQuery).toBe(expectedQueries[this.dbType])
  }

  // lets start simple, it should resolve for all connection types
  async tablePropertiesTests() {
    await this.connection.getTableProperties('group', this.defaultSchema)

    if (!this.data.disabledFeatures?.createIndex) {
      const indexes = await this.connection.listTableIndexes('has_index', this.defaultSchema)
      const names = indexes.map((i) => i.name)
      expect(names).toContain('has_index_foo_idx')
    }
  }

  async indexTests() {
    if (this.data.disabledFeatures?.createIndex) return;
    await this.knex.schema.createTable("index_test", (table) => {
      table.increments('id').primary()
      table.integer('index_me')
      table.integer('me_too')
    })
    await this.connection.alterIndex({
      table: 'index_test',
      schema: this.defaultSchema,
      drops: [],
      additions: [{
        name: 'it_idx',
        columns: [{ name: 'index_me', order: 'ASC' }]
      }]
    })
    const indexes = await this.connection.listTableIndexes('index_test', this.defaultSchema)
    expect(indexes.map((i) => i.name)).toContain('it_idx')
    await this.connection.alterIndex({
      drops: [{ name: 'it_idx' }],
      additions: [{ name: 'it_idx2', columns: [{ name: 'me_too', order: 'ASC'}] }],
      table: 'index_test',
      schema: this.defaultSchema
    })
    const updatedIndexesRaw: TableIndex[] = await this.connection.listTableIndexes('index_test', this.defaultSchema)

    const updatedIndexes = updatedIndexesRaw.filter((i) => !i.primary)

    const picked = updatedIndexes.map((i) => _.pick(i, ['name', 'columns', 'table', 'schema']))
    const schemaDefault = this.defaultSchema ? { schema: this.defaultSchema } : {}
    expect(picked).toMatchObject(
      [
        {
        ...schemaDefault,
        name: 'it_idx2',
        columns: [{name: 'me_too', order: 'ASC'}],
        table: 'index_test',
      }]
    )

  }

  async streamTests() {
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
    expect(result.columns.map(c => c.columnName)).toMatchObject(['id', 'name'])
    expect(result.totalRows).toBe(6)
    const cursor = result.cursor
    await cursor.start()
    const b1 = await cursor.read()
    expect(b1.length).toBe(5)
    expect(b1.map(r => r[1])).toMatchObject(names.map(r => r.name).slice(0, 5))
    const b2 = await cursor.read()
    expect(b2.length).toBe(1)
    expect(b2[0][1]).toBe(names[names.length - 1].name)
    const b3 = await cursor.read()
    expect(b3).toMatchObject([])
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
      if (!this.data.disabledFeatures?.createIndex) {
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
