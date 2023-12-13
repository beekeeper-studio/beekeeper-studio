import {Knex} from 'knex'
import knex from 'knex'
import { DBConnection, IDbConnectionServerConfig } from '../../src/lib/db/client'
import { createServer } from '../../src/lib/db/index'
import log from 'electron-log'
import platformInfo from '../../src/common/platform_info'
import { IDbConnectionPublicServer } from '../../src/lib/db/server'
import { AlterTableSpec, Dialect, DialectData, FormatterDialect } from '../../../../shared/src/lib/dialects/models'
import { getDialectData } from '../../../../shared/src/lib/dialects/'
import _ from 'lodash'
import { TableIndex } from '../../src/lib/db/models'
export const dbtimeout = 120000
import '../../src/common/initializers/big_int_initializer.ts'
import { safeSqlFormat } from '../../src/common/utils'
import knexFirebirdDialect from 'knex-firebird-dialect'


const KnexTypes: any = {
  postgresql: 'pg',
  'mysql': 'mysql2',
  "mariadb": "mysql2",
  "sqlite": "sqlite3",
  "sqlserver": "mssql",
  "cockroachdb": "pg",
  "firebird": knexFirebirdDialect,
}

export interface Options {
  dialect: Dialect,
  defaultSchema?: string
  version?: string,
  skipPkQuote?: boolean
  knexConnectionConfig?: Record<string, any>
}

export class DBTestUtil {
  public knex: Knex
  public server: IDbConnectionPublicServer
  public connection: DBConnection
  public extraTables = 0
  private options: Options
  private dbType: string

  private dialect: Dialect
  public data: DialectData

  public preInitCmd: string | undefined
  public defaultSchema: string = undefined

  private personId: number
  private jobId: number

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
          ...options.knexConnectionConfig,
        },
        pool: { min: 0, max: 50 }
      })
    }

    this.defaultSchema = options?.defaultSchema || this.defaultSchema
    this.server = createServer(config)
    this.connection = this.server.createConnection(database)
  }

  maybeArrayToObject(items, key) {
    // Only 'firebird knex' returns an object instead of an array.
    if (!Array.isArray(items)) {
      items = [items]
    }
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

    this.jobId = jobs[0].id
    this.personId = people[0].id
    await this.knex("people_jobs").insert({job_id: this.jobId, person_id: this.personId })
  }

  async dropTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    await this.connection.dropElement('test_inserts', 'TABLE', this.defaultSchema)
    const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
    expect(newTablesCount.length).toBeLessThan(tables.length)
  }

  async badDropTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    const expectedQueries = {
      postgresql: 'test_inserts"drop table test_inserts"',
      mysql: "test_inserts'drop table test_inserts'",
      mariadb: "test_inserts'drop table test_inserts'",
      sqlite: 'test_inserts"drop table test_inserts"',
      sqlserver: 'test_inserts[drop table test_inserts]',
      cockroachdb: 'test_inserts"drop table test_inserts"'
    }
    try {
      await this.connection.dropElement(expectedQueries[this.dbType], 'TABLE', this.defaultSchema)
      const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
      expect(newTablesCount.length).toEqual(tables.length)
    } catch (err) {
      const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
      expect(newTablesCount.length).toEqual(tables.length)
    }
  }

  async createDatabaseTests() {
    const dbs = await this.connection.listDatabases()
    const collation = 'utf8_general_ci'
    let charset = 'utf8'
    if (this.dbType === 'postgresql') {
      charset = 'UTF8'
    }
    await this.connection.createDatabase('new-db_2', charset, collation)

    if (this.dbType === 'sqlite') {
      // sqlite doesn't list the databases out because they're different files anyway so if it doesn't explode, we're happy as a clam
      return expect.anything()
    }
    const newDBsCount = await this.connection.listDatabases()

    expect(dbs.length).toBeLessThan(newDBsCount.length)
  }

  async badCreateDatabaseTests() {
    // sqlserver seems impervious to bad database names or bad charsets or anything.
    if (this.dbType === 'sqlserver') {
      return expect.anything()
    }

    const dbs = await this.connection.listDatabases()
    try {
      await this.connection.createDatabase('not a database name()probably', 'idfk', 'notimportant')
      const newDBsCount = await this.connection.listDatabases()
      expect(dbs.length).toEqual(newDBsCount.length)
    } catch (err) {
      const newDBsCount = await this.connection.listDatabases()
      expect(dbs.length).toEqual(newDBsCount.length)
    }
  }

  async truncateTableTests() {
    await this.knex('group_table').insert({select_col: 'something'})
    await this.knex('group_table').insert({select_col: 'something'})
    const initialRowCount = await this.knex.select().from('group_table')

    await this.connection.truncateElement('group_table', 'TABLE', this.defaultSchema)
    const newRowCount = await this.knex.select().from('group_table')

    expect(newRowCount.length).toBe(0)
    expect(initialRowCount.length).toBeGreaterThan(newRowCount.length)
  }

  async badTruncateTableTests() {
    await this.knex('group_table').insert({select_col: 'something'})
    await this.knex('group_table').insert({select_col: 'something'})
    const initialRowCount = await this.knex.select().from('group_table')
    const expectedQueries = {
      postgresql: 'group"drop table test_inserts"',
      mysql: "group'drop table test_inserts'",
      mariadb: "group'drop table test_inserts'",
      sqlite: 'group"Delete from test_inserts; vacuum;"',
      sqlserver: 'group[drop table test_inserts]',
      cockroachdb: 'group"drop table test_inserts"'
    }
    try {
      // TODO: this should not the right method to call here
      await this.connection.dropElement(expectedQueries[this.dbType], 'TABLE', this.defaultSchema)
      const newRowCount = await this.knex.select().from('group_table')
      expect(newRowCount.length).toEqual(initialRowCount.length)
    } catch (err) {
      const newRowCount = await this.knex.select().from('group_table')
      expect(newRowCount.length).toEqual(initialRowCount.length)
    }
  }

  async duplicateTableSqlTests() {
    const sql = await this.connection.duplicateTableSql('group_table', 'group_copy', this.defaultSchema)

    expect(sql).not.toBeUndefined()
    expect(sql).not.toBeNull()
    expect(sql).not.toEqual('')

  }


  async duplicateTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })

    await this.connection.duplicateTable('group_table', 'group_copy', this.defaultSchema)

    const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })

    const originalTableRowCount = await this.knex.select().from('group_table')
    const duplicateTableRowCount = await this.knex.select().from('group_copy')

    expect(newTablesCount.length).toBe(tables.length + 1)
    expect(originalTableRowCount.length).toBe(duplicateTableRowCount.length)

  }

  async badDuplicateTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })

    try {
      await this.connection.duplicateTable('tableDoesntExists', 'tableDoesntExists_copy', this.defaultSchema)
      const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
      expect(newTablesCount.length).toEqual(tables.length)
    } catch (error) {
      const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
      expect(newTablesCount.length).toEqual(tables.length)
    }
  }

  async listTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    expect(tables.length).toBeGreaterThanOrEqual(this.expectedTables)
    const columns = await this.connection.listTableColumns("people", this.defaultSchema)
    expect(columns.length).toBe(7)
  }

  async tableColumnsTests() {
    const columns = await this.connection.listTableColumns(null, this.defaultSchema)
    const groupColumns = columns.filter((row) => row.tableName.toLowerCase() === 'group_table')
    expect(groupColumns.length).toBe(2)
  }

  /**
   * Tests related to the table view
   * fetching PK, selecting data, etc.
   */
  async tableViewTests() {
    const ID = this.dbType === 'firebird' ? 'ID' : 'id'

    // reserved word as table name
    expect(await this.connection.getPrimaryKey("group_table", this.defaultSchema))
      .toBe(ID);

    expect(await this.connection.getPrimaryKey("MixedCase", this.defaultSchema))
      .toBe(ID);

    const stR = await this.connection.selectTop("group_table", 0, 10, [{ field: "select_col", dir: 'ASC'} ], [], this.defaultSchema)
    expect(stR)
      .toMatchObject({ result: [] })

    await this.knex("group_table").insert({select_col: "bar"})
    await this.knex("group_table").insert({select_col: "abc"})

    let r = await this.connection.selectTop("group_table", 0, 10, [{field: "select_col", dir: 'ASC'}], [], this.defaultSchema)
    let result = r.result.map((r: any) => r.select_col)
    expect(result).toMatchObject(["abc", "bar"])

    r = await this.connection.selectTop("group_table", 0, 10, [{field: 'select_col', dir: 'DESC'}], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col)
    expect(result).toMatchObject(['bar', 'abc'])

    r = await this.connection.selectTop("group_table", 0, 1, [{ field: 'select_col', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col)
    expect(result).toMatchObject(['bar'])

    r = await this.connection.selectTop("group_table", 1, 10, [{ field: 'select_col', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col)
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

    expect(simpleResult.find((c) => c.columnName?.toLowerCase() === 'family_name')).toBeTruthy()


    // only databases that can actually change things past this point.
    if (this.data.disabledFeatures?.alter?.alterColumn) return

    await this.knex.schema.dropTableIfExists("alter_test")
    await this.knex.schema.createTable("alter_test", (table) => {
      if (this.dbType === 'firebird') {
        table.specificType('id', 'VARCHAR(255) NOT NULL')
        table.specificType('first_name', 'VARCHAR(255)')
        table.specificType('last_name', "VARCHAR(255) DEFAULT 'Rath''bone' NOT NULL")
        table.specificType('age', "VARCHAR(255) DEFAULT '8'")
      } else {
        table.specificType("id", 'varchar(255)').notNullable()
        table.specificType("first_name", "varchar(255)").nullable()
        table.specificType("last_name", "varchar(255)").notNullable().defaultTo('Rath\'bone')
        table.specificType("age", "varchar(255)").defaultTo('8').nullable()
      }
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
          newValue: 'varchar(256)'
        },
        {
          columnName: 'first_name',
          changeType: 'defaultValue',
          newValue: this.dbType === 'firebird' ? "Foo'bar" : "'Foo''bar'"
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
          newValue: 'varchar(256)'
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

    const columnName = (s: string) => {
      if (this.dbType === 'firebird') return s.toUpperCase()
      return s
    }

    const expected = [
      {
        columnName: columnName('id'),
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: null,
      },
      {
        columnName: columnName('first_name'),
        dataType: 'varchar(256)',
        nullable: true,
        defaultValue: defaultValue("Foo'bar"),
      },
      {
        columnName: columnName('family_name'),
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: defaultValue('Rath\'bone'),
      },
      {
        columnName: columnName('age'),
        dataType: 'varchar(256)',
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

    // filter test - builder in clause
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["pears"] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])

    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["apples"] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject([])

    await this.knex("MixedCase").insert({bananas: "cheese"}).returning("id")

    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["pears", 'cheese'] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears', 'cheese'])

    await this.knex('MixedCase').where({bananas: 'cheese'}).delete()

    // filter test - raw
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], "bananas = 'pears'", this.defaultSchema)
    result = r.result.map((r: any) => r.bananas)
    expect(result).toMatchObject(['pears'])
  }

  async columnFilterTests() {
    let r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema)
    expect(r.result).toEqual([{
      // integer equality tests need additional logic for sqlite's BigInts (Issue #1399)
      person_id: this.dbType === 'sqlite' ? BigInt(this.personId) : this.personId,
      job_id: this.dbType === 'sqlite' ? BigInt(this.jobId) : this.jobId,
      created_at: null,
      updated_at: null,
    }])

    r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema, ['person_id'])
    expect(r.result).toEqual([{
      person_id: this.dbType === 'sqlite' ? BigInt(this.personId) : this.personId,
    }])

    r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema, ['person_id', 'job_id'])
    expect(r.result).toEqual([{
      person_id: this.dbType === 'sqlite' ? BigInt(this.personId) : this.personId,
      job_id: this.dbType === 'sqlite' ? BigInt(this.jobId) : this.jobId,
    }])
  }

  async triggerTests() {
    // it should just complete without erroring
    await this.connection.listTableTriggers("MixedCase", this.defaultSchema)
  }

  async primaryKeyTests() {
    const ID = this.dbType === 'firebird' ? 'ID' : 'id'
    // primary key tests
    let pk = await this.connection.getPrimaryKey("people", this.defaultSchema)
    expect(pk).toBe(ID)

    if (!this.options.skipPkQuote) {
      pk = await this.connection.getPrimaryKey("tablewith'char", this.defaultSchema)
      expect(pk).toBe("one")
    }

    const rawPkres = await this.connection.getPrimaryKeys('with_composite_pk', this.defaultSchema)
    const pkres = rawPkres.map((key) => key.columnName.toLowerCase());
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
      cockroachdb: `insert into "public"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
      firebird: "insert into jobs (hourly_rate, job_name) values (41, 'Programmer')",
    }

    expect(insertQuery).toBe(expectedQueries[this.dbType])
  }

  async buildSelectTopQueryTests() {
    const dbType = this.dbType === 'mariadb' ? 'mysql' : this.dbType
    const fmt = (sql: string) => safeSqlFormat(sql, {
      language: FormatterDialect(dbType === 'cockroachdb'
          ? 'postgresql'
          : this.dialect
        )
      })

    const query = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [{ field: 'hourly_rate', dir: 'asc' }],
      [{ field: 'job_name', type: 'in', value: ['Programmer', "Surgeon's Assistant"] }],
      'public',
      ['*']
    )
    const expectedQueries = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `job_name` IN ('Programmer','Surgeon\\'s Assistant') ORDER BY `hourly_rate` ASC LIMIT 100 OFFSET 0",
      // mariadb: same as mysql
      sqlite: "SELECT * FROM `jobs` WHERE `job_name` IN ('Programmer','Surgeon''s Assistant') ORDER BY `hourly_rate` ASC LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [public].[jobs] WHERE [job_name] IN ('Programmer','Surgeon''s Assistant') ORDER BY [hourly_rate] ASC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE job_name IN ('Programmer','Surgeon''s Assistant') ORDER BY hourly_rate ASC"
    }
    expect(fmt(query)) .toBe(fmt(expectedQueries[dbType]))

    const multipleFiltersQuery = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [{ field: 'hourly_rate', dir: 'asc' }],
      [
        { field: 'job_name', type: 'in', value: ['Programmer', "Surgeon's Assistant"] },
        { op: "AND", field: 'hourly_rate', type: '>=', value: '41' },
        { op: "OR", field: 'hourly_rate', type: '>=', value: '31' },
      ],
      'public',
      ['*']
    )
    const expectedFiltersQueries = {
      postgresql: `
        SELECT * FROM "public"."jobs"
          WHERE "job_name" IN ('Programmer','Surgeon''s Assistant')
          AND "hourly_rate" >= '41'
          OR "hourly_rate" >= '31'
        ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0
      `,
      mysql: `
        SELECT * FROM \`jobs\`
          WHERE \`job_name\` IN ('Programmer','Surgeon\\'s Assistant')
          AND \`hourly_rate\` >= '41'
          OR \`hourly_rate\` >= '31'
        ORDER BY \`hourly_rate\` ASC LIMIT 100 OFFSET 0
      `,
      // mariadb: same as mysql
      sqlite: `
        SELECT * FROM \`jobs\`
          WHERE \`job_name\` IN ('Programmer','Surgeon''s Assistant')
          AND \`hourly_rate\` >= '41'
          OR \`hourly_rate\` >= '31'
        ORDER BY \`hourly_rate\` ASC LIMIT 100 OFFSET 0
      `,
      sqlserver: `
        SELECT * FROM [public].[jobs]
          WHERE [job_name] IN ('Programmer','Surgeon''s Assistant')
          AND [hourly_rate] >= '41'
          OR [hourly_rate] >= '31'
        ORDER BY [hourly_rate] ASC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY
      `,
      cockroachdb: `
        SELECT * FROM "public"."jobs"
          WHERE "job_name" IN ('Programmer','Surgeon''s Assistant')
            AND "hourly_rate" >= '41'
            OR "hourly_rate" >= '31'
        ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0
      `,
      firebird: `
        SELECT FIRST 100 SKIP 0 * FROM jobs
          WHERE job_name IN ('Programmer', 'Surgeon''s Assistant')
            AND hourly_rate >= '41'
            OR hourly_rate >= '31'
        ORDER BY hourly_rate ASC
      `,
    }
    expect(fmt(multipleFiltersQuery)).toBe(fmt(expectedFiltersQueries[dbType]))
  }

  // lets start simple, it should resolve for all connection types
  async tablePropertiesTests() {
    await this.connection.getTableProperties('group_table', this.defaultSchema)

    if (!this.data.disabledFeatures?.createIndex) {
      const indexes = await this.connection.listTableIndexes('has_index', this.defaultSchema)
      const names = indexes.map((i) => i.name.toLowerCase())
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
    expect(indexes.map((i) => i.name.toLowerCase())).toContain('it_idx')
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

    const useTimestamps = this.dbType === 'firebird'

    const primary = (table: Knex.CreateTableBuilder) => {
      if (this.dbType === 'firebird') {
        table.specificType('id', 'integer generated by default as identity primary key')
      } else {
        table.increments().primary()
      }
    }

    const timestamps = (table: Knex.CreateTableBuilder) => {
      if (this.dbType === 'firebird') {
        table.timestamps(true)
      } else {
        table.timestamps()
      }
    }

    await this.knex.schema.createTable('addresses', (table) => {
      primary(table)
      timestamps(table)
      table.string("street")
      table.string("city")
      table.string("state")
      table.string("country").notNullable()
    })

    await this.knex.schema.createTable('MixedCase', (table) => {
      primary(table)
      table.string("bananas")
    })

    await this.knex.schema.createTable('group_table', (table) => {
      primary(table)
      table.string("select_col")
    })

    await this.knex.schema.createTable("people", (table) => {
      primary(table)
      table.timestamps(useTimestamps)
      table.string("firstname")
      table.string("lastname")
      table.string("email").notNullable()
      table.integer("address_id").notNullable().unsigned()
      table.foreign("address_id").references("addresses.id")
    })

    await this.knex.schema.createTable("jobs", (table) => {
      primary(table)
      table.timestamps(useTimestamps)
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
      timestamps(table)
    })

    await this.knex.schema.createTable('with_composite_pk', (table) => {
      table.integer("id1").notNullable().unsigned()
      table.integer("id2").notNullable().unsigned()
      table.primary(["id1", "id2"])
    })

    // Firebird does not support special chars in identifiers
    if (this.dbType !== 'firebird') {
      await this.knex.schema.createTable("tablewith'char", (table) => {
        table.integer("one").unsigned().notNullable().primary()
      })
    }
  }

  async databaseVersionTest() {
    const version = this.connection.versionString();
    expect(version).toBeDefined()
  }
}
