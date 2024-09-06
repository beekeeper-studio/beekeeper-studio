import {Knex} from 'knex'
import knex from 'knex'
import { ConnectionType, DatabaseElement, IDbConnectionServerConfig } from '../../src/lib/db/types'
import log from 'electron-log'
import platformInfo from '../../src/common/platform_info'
import { AlterTableSpec, Dialect, DialectData, dialectFor, FormatterDialect, Schema, SchemaItemChange } from '@shared/lib/dialects/models'
import { getDialectData } from '@shared/lib/dialects/'
import _ from 'lodash'
import { TableIndex, TableOrView } from '../../src/lib/db/models'
export const dbtimeout = 120000
import '../../src/common/initializers/big_int_initializer.ts'
import { safeSqlFormat } from '../../src/common/utils'
import knexFirebirdDialect from 'knex-firebird-dialect'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator'
import { IDbConnectionPublicServer } from './db/serverTypes'
// TODO (@day): this may need to be moved uggh
import { createServer } from '@commercial/backend/lib/db/server'

type ConnectionTypeQueries = Partial<Record<ConnectionType, string>>
type DialectQueries = Record<Dialect, string>
type Queries = ConnectionTypeQueries & DialectQueries

/*
 * Make all properties lowercased. This is useful to even out column names
 * between databases especially for Firebird where the column names
 * (or any identifiers) are always uppercased and not case-sensitive.
 **/
export function rowobj(row: any) {
  function modify(o: any) {
    return Object.entries(o).reduce((acc, [key, value]) => {
      acc[key.toLowerCase()] = value
      return acc
    }, {})
  }
  if (Array.isArray(row)) {
    return row.map(modify)
  }
  return modify(row)
}

// Helper function to test tables easier
function normalizeTables(tables: TableOrView[], dbType: string): TableOrView[] {
  if (dbType === 'firebird') {
    return tables.map((table) => ({
      ...table,
      name: table.name.toLowerCase(),
    }))
  }
  return tables;
}

const KnexTypes: any = {
  postgresql: 'pg',
  'mysql': 'mysql2',
  "mariadb": "mysql2",
  "tidb": "mysql2",
  "sqlite": "sqlite3",
  "sqlserver": "mssql",
  "cockroachdb": "pg",
  "firebird": knexFirebirdDialect,
  "oracle": "oracledb",
}

export interface Options {
  dialect: Dialect,
  defaultSchema?: string
  version?: string,
  skipPkQuote?: boolean
  /** Skip creation of table with generated columns and the tests */
  skipGeneratedColumns?: boolean
  skipCreateDatabase?: boolean
  knexConnectionOptions?: Record<string, any>
  knex?: Knex
}

export class DBTestUtil {
  public knex: Knex
  public server: IDbConnectionPublicServer
  public connection: BasicDatabaseClient<any>
  public extraTables = 0
  private options: Options
  private dbType: ConnectionType | 'generic'

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
    if (options.knex) {
      this.knex = options.knex
    } else if (config.client === 'sqlite') {
      this.knex = knex({
        client: "better-sqlite3",
        connection: {
          filename: database
        }
      })
    } else if (config.client === 'oracle') {
      this.knex = knex({
        client: 'oracledb',
        connection: {
          user: config.user,
          password: config.password,
          connectString: `${config.host}:${config.port}/${config.serviceName}`,
          requestTimeout: 1000
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
          ...options.knexConnectionOptions,
        },
        pool: { min: 0, max: 50 }
      })
    }

    this.defaultSchema = options?.defaultSchema || this.defaultSchema
    this.server = createServer(config)
    this.connection = this.server.createConnection(database)
  }

  async disconnect() {
    if (this.connection) await this.connection.disconnect();
    // https://github.com/jestjs/jest/issues/11463
    if (this.knex) await this.knex.destroy();
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

  buildImportData(tableName, schemaName = null) {
    const data = [
      {
        'name': 'biff',
        'hat': 'beret'
      },
      {
        'name': 'spud',
        'hat': 'fez'
      },
      {
        'name': 'chuck',
        'hat': 'barretina'
      },
      {
        'name': 'lou',
        'hat': 'tricorne'
      }
    ]
    return data.map(d => ({
      table: tableName,
      schema: schemaName,
      data: [d]
    }))
  }

  /** Format the SQL with the correct dialect */
  fmt(sql: string) {
    return safeSqlFormat(sql, { language: FormatterDialect(dialectFor(this.dbType)) })
  }

  async setupdb() {
    await this.connection.connect()
    await this.createTables()
    const address = this.maybeArrayToObject(await this.knex("addresses").insert({country: "US"}).returning("id"), 'id')
    const isOracle = this.connection.connectionType === 'oracle'
    await this.knex("MixedCase").insert({bananas: "pears"}).returning("id")
    const people = this.maybeArrayToObject(await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0].id}).returning("id"), 'id')
    const jobs = this.maybeArrayToObject(await this.knex("jobs").insert({job_name: "Programmer"}).returning("id"), 'id')

    // Oracle or Knex has decided in its infinite wisdom to return the ids as strings, so make em numbers for the id because that's what they are in the table itself.
    this.jobId = isOracle ? Number(jobs[0].id) : jobs[0].id
    this.personId = isOracle ? Number(people[0].id) : people[0].id
    await this.knex("people_jobs").insert({job_id: this.jobId, person_id: this.personId })

    // See createTables for why this is commented out
    // await this.knex("foo.bar").insert({ id: 1, name: "Dots are evil" });


    if (!this.options.skipGeneratedColumns) {
      await this.knex('with_generated_cols').insert([
        { id: 1, first_name: 'Tom', last_name: 'Tester' },
      ])
    }
  }

  async dropTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    await this.connection.dropElement('test_inserts', DatabaseElement.TABLE, this.defaultSchema)
    const newTablesCount = await this.connection.listTables({ schema: this.defaultSchema })
    expect(newTablesCount.length).toBeLessThan(tables.length)
  }

  async badDropTableTests() {
    const tables = await this.connection.listTables({ schema: this.defaultSchema })
    const expectedQueries = {
      postgresql: 'test_inserts"drop table test_inserts"',
      mysql: "test_inserts'drop table test_inserts'",
      tidb: "test_inserts'drop table test_inserts'",
      mariadb: "test_inserts'drop table test_inserts'",
      sqlite: 'test_inserts"drop table test_inserts"',
      sqlserver: 'test_inserts[drop table test_inserts]',
      cockroachdb: 'test_inserts"drop table test_inserts"',
      oracle: 'test_inserts"drop table test_inserts"'
    }
    try {
      await this.connection.dropElement(expectedQueries[this.dbType], DatabaseElement.TABLE, this.defaultSchema)
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

    if (this.dialect.match(/sqlite|firebird/)) {
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

    await this.connection.truncateElement('group_table', DatabaseElement.TABLE, this.defaultSchema)
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
      tidb: "group'drop table test_inserts'",
      mariadb: "group'drop table test_inserts'",
      sqlite: 'group"Delete from test_inserts; vacuum;"',
      sqlserver: 'group[drop table test_inserts]',
      cockroachdb: 'group"drop table test_inserts"'
    }
    try {
      // TODO: this should not the right method to call here
      await this.connection.dropElement(expectedQueries[this.dbType], DatabaseElement.TABLE, this.defaultSchema)
      const newRowCount = await this.knex.select().from('group_table')
      expect(newRowCount.length).toEqual(initialRowCount.length)
    } catch (err) {
      const newRowCount = await this.knex.select().from('group_table')
      expect(newRowCount.length).toEqual(initialRowCount.length)
    } finally {
      await this.connection.truncateElement('group_table', DatabaseElement.TABLE, this.defaultSchema)
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
    const ogTables: TableOrView[] = await this.connection.listTables({ schema: this.defaultSchema })
    const tables = normalizeTables(ogTables, this.dbType)
    expect(tables.length).toBeGreaterThanOrEqual(this.expectedTables)

    expect(tables.map((t) => t.name)).toContain('people')
    expect(tables.map((t) => t.name)).toContain('people_jobs')
    expect(tables.map((t) => t.name)).toContain('addresses')
    expect(tables.map((t) => t.name)).toContain('group_table')
    expect(tables.map((t) => t.name)).toContain('jobs')
    expect(tables.map((t) => t.name)).toContain('has_index')
    expect(tables.map((t) => t.name)).toContain('with_composite_pk')
    if (this.dbType === 'firebird') {
      expect(tables.map((t) => t.name)).toContain('mixedcase')
    } else {
      expect(tables.map((t) => t.name)).toContain('MixedCase')
      expect(tables.map((t) => t.name)).toContain("tablewith'char")
    }
    const columns = await this.connection.listTableColumns("people", this.defaultSchema)
    expect(columns.length).toBe(7)
  }

  async tableColumnsTests() {
    const columns = await this.connection.listTableColumns(null, this.defaultSchema)
    const mixedCaseColumns = await this.connection.listTableColumns('MixedCase', this.defaultSchema)
    const defaultValues = mixedCaseColumns.map(r => r.hasDefault)
    const trueFalseDBs = ['mariadb', 'mysql', 'tidb', 'cockroachdb', 'postgresql']

    if (trueFalseDBs.indexOf(this.dbType) !== -1) expect(defaultValues).toEqual([true,  false])
    else expect(defaultValues).toEqual([false, false])

    const groupColumns = columns.filter((row) => row.tableName.toLowerCase() === 'group_table')
    expect(groupColumns.length).toBe(2)
  }


  async testDotTable() {
    // FIXME: Make this generic to all tables.
    // see 'createTables' for why this is commented out
    // const r = await this.connection.selectTop("foo.bar", 0, 10, [{field: 'id', dir: 'ASC'}], this.defaultSchema)
    // const result = r.result.map((r: any) => r.name || r.NAME)
    // expect(result).toMatchObject(['Dots are evil'])
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
    let result = r.result.map((r: any) => r.select_col || r.SELECT_COL)
    expect(result).toMatchObject(["abc", "bar"])

    r = await this.connection.selectTop("group_table", 0, 10, [{field: 'select_col', dir: 'DESC'}], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col || r.SELECT_COL)
    expect(result).toMatchObject(['bar', 'abc'])

    r = await this.connection.selectTop("group_table", 0, 1, [{ field: 'select_col', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col || r.SELECT_COL)
    expect(result).toMatchObject(['bar'])

    r = await this.connection.selectTop("group_table", 1, 10, [{ field: 'select_col', dir: 'DESC' }], [], this.defaultSchema)
    result = r.result.map((r: any) => r.select_col || r.SELECT_COL)
    expect(result).toMatchObject(['abc'])

    r = await this.connection.selectTop("MixedCase", 0, 1, [], [], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject(["pears"])

    await this.testDotTable()

    await this.knex("group_table").where({select_col: "bar"}).delete()
    await this.knex("group_table").where({select_col: "abc"}).delete()
  }


  async addDropTests() {
    const initial = {
      table: 'add_drop_test',
      adds: [
        {
          columnName: 'one',
          dataType: 'char',
          nullable: true,
        }
      ]
    }

    await this.knex.schema.dropTableIfExists('add_drop_test')
    await this.knex.schema.createTable('add_drop_test', (table) => {
      table.increments('name', {primaryKey: true})
    })

    await this.connection.alterTable(initial)
    const schema = await this.connection.listTableColumns('add_drop_test', this.defaultSchema)
    expect(schema.length).toBe(2)
    expect(schema[1].columnName).toMatch(/one/i)

    const doubleAdd = {
      table: 'add_drop_test',
      schema: this.defaultSchema,
      adds: [
        {
          columnName: 'two',
          dataType: 'char',
          nullable: true
        },
        {
          columnName: 'three',
          dataType: 'char',
          nullable: true
        }
      ],
      drops: ['one']
    }

    await this.connection.alterTable(doubleAdd)
    const secondSchema = await this.connection.listTableColumns('add_drop_test', this.defaultSchema)
    expect(secondSchema.length).toBe(3)
    expect(secondSchema.map((s) => s.columnName.toLowerCase())).toMatchObject(['name', 'two', 'three'])

    await this.connection.alterTable({table: 'add_drop_test', drops: ['two', 'three']})
    const thirdSchema = await this.connection.listTableColumns('add_drop_test', this.defaultSchema)
    expect(thirdSchema.length).toBe(1)
    expect(thirdSchema[0].columnName).toMatch(/name/i)

  }

  async alterTableTests() {

    await this.knex.schema.dropTableIfExists("alter_test")
    await this.knex.schema.createTable("alter_test", (table) => {
      table.specificType("id", 'varchar(255)').notNullable()
      table.specificType("first_name", "varchar(255)").nullable()
      table.specificType("last_name", "varchar(255)").notNullable().defaultTo('Rathbone')
      table.specificType("age", "varchar(255)").defaultTo('8').nullable()
    })

    const alteration: SchemaItemChange = {
      columnName: 'last_name',
      changeType: 'columnName',
      newValue: 'family_name'
    }

    const simpleChange = {
      table: 'alter_test',
      alterations: [
        alteration
      ]
    }

    await this.connection.alterTable(simpleChange)
    const simpleResult = await this.connection.listTableColumns('alter_test')

    expect(simpleResult.find((c) => c.columnName?.toLowerCase() === 'family_name')).toBeTruthy()


    // only databases t can actually change things past this point.
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
          newValue: "'99'"
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
      _.pick(c, 'nullable', 'defaultValue', 'columnName', 'dataType') as any
    )


    // cockroach adds a rowid column if there's no primary key.
    const result = rawResult.filter((r) => r.columnName !== 'rowid')


    // this is different in each database.
    const defaultValue = (s: any) => {
      if (s === null) return null
      if (this.dbType === 'cockroachdb' && _.isNumber(s)) return `'${s.toString().replaceAll("'", "''")}':::STRING`
      if (this.dbType === 'cockroachdb') return `e'${s.replaceAll("'", "\\'")}':::STRING`
      if (this.dialect === 'postgresql') return `'${s.toString().replaceAll("'", "''")}'::character varying`
      if (this.dialect === 'oracle') return `'${s.toString().replaceAll("'", "''")}'`
      if (this.dialect === 'sqlserver') return `('${s.toString().replaceAll("'", "''")}')`
      if (this.dialect === 'firebird') return `'${s.toString().replaceAll("'", "''")}'`
      return s.toString()
    }

    const tbl = (o: Record<keyof MiniColumn, any>) => {
      let columnName = o.columnName
      let dataType = o.dataType

      if (this.dbType === 'firebird') {
        columnName = columnName.toUpperCase()
        dataType = dataType.toUpperCase()
      }


      return {
        columnName,
        dataType,
        nullable: o.nullable,
        defaultValue: defaultValue(o.defaultValue),
      }
    }


    const varchar = (length: number) => {
      const str = this.dialect === 'oracle' ? 'VARCHAR2' : 'varchar'
      return `${str}(${length})`
    }

    const expected = [
      tbl({
        columnName: 'id',
        dataType: varchar(255),
        nullable: false,
        defaultValue: null,
      }),
      tbl({
        columnName: 'first_name',
        dataType: varchar(256),
        nullable: true,
        defaultValue: "Foo'bar",
      }),
      tbl({
        columnName: 'family_name',
        dataType: varchar(255),
        nullable: false,
        defaultValue: 'Rath\'bone',
      }),
      tbl({
        columnName: 'age',
        dataType: varchar(256),
        nullable: false,
        defaultValue: 99,
      }),
    ]
    expect(result).toMatchObject(expected)

  }

  async renameElementsTests() {
    if (!this.data.disabledFeatures?.alter?.renameSchema) {
      await this.knex.schema.dropSchemaIfExists("rename_schema")
      await this.knex.schema.createSchema("rename_schema")

      await this.connection.setElementName('rename_schema', 'renamed_schema', DatabaseElement.SCHEMA)

      expect(await this.connection.listSchemas()).toContain('renamed_schema')
    }

    if (!this.data.disabledFeatures?.alter?.renameTable) {
      await this.knex.schema.dropTableIfExists("rename_table")
      await this.knex.schema.createTable("rename_table", (table) => {
        table.specificType("id", 'varchar(255)')
      })

      await this.connection.setElementName('rename_table', 'renamed_table', DatabaseElement.TABLE, this.defaultSchema)

      expect(await this.knex.schema.hasTable('renamed_table')).toBe(true)
    }

    if (!this.data.disabledFeatures?.alter?.renameView) {
      await this.knex.schema.dropViewIfExists("rename_view");
      await this.knex.schema.createView("rename_view", (view) => {
        view.columns(["id"])
        view.as(this.knex("renamed_table").select("id"))
      })

      await this.connection.setElementName('rename_view', 'renamed_view', DatabaseElement.VIEW, this.defaultSchema)

      const views = await this.connection.listViews()
      expect(views.find((view) => view.name === 'renamed_view')).toBeTruthy()
    }
  }

  async filterTests() {
    // filter test - builder

    let r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: '=', value: "pears" }], this.defaultSchema)
    let result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject(['pears'])

    // filter test - builder in clause
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["pears"] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject(['pears'])

    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["apples"] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject([])

    await this.knex("MixedCase").insert({bananas: "cheese"}).returning("id")

    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], [{ field: 'bananas', type: 'in', value: ["pears", 'cheese'] }], this.defaultSchema)
    result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject(['pears', 'cheese'])

    await this.knex('MixedCase').where({bananas: 'cheese'}).delete()

    // filter test - raw
    const filter = `${this.data.wrapIdentifier('bananas')} = 'pears'`
    r = await this.connection.selectTop("MixedCase", 0, 10, [{ field: 'bananas', dir: 'DESC' }], filter, this.defaultSchema)
    result = r.result.map((r: any) => r.bananas || r.BANANAS)
    expect(result).toMatchObject(['pears'])
  }

  async columnFilterTests() {
    let r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema)
    expect(rowobj(r.result)).toEqual([{
      // integer equality tests need additional logic for sqlite's BigInts (Issue #1399)
      person_id: this.dialect === 'sqlite' ? BigInt(this.personId) : this.personId,
      job_id: this.dialect === 'sqlite' ? BigInt(this.jobId) : this.jobId,
      created_at: null,
      updated_at: null,
    }])

    r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema, ['person_id'])
    expect(rowobj(r.result)).toEqual([{
      person_id: this.dialect === 'sqlite' ? BigInt(this.personId) : this.personId,
    }])

    r = await this.connection.selectTop("people_jobs", 0, 10, [], [], this.defaultSchema, ['person_id', 'job_id'])
    expect(rowobj(r.result)).toEqual([{
      person_id: this.dialect === 'sqlite' ? BigInt(this.personId) : this.personId,
      job_id: this.dialect === 'sqlite' ? BigInt(this.jobId) : this.jobId,
    }])
  }

  async triggerTests() {
    // it should just complete without erroring
    await this.connection.listTableTriggers("MixedCase", this.defaultSchema)
  }

  async primaryKeyTests() {
    // primary key tests
    let pk = await this.connection.getPrimaryKey("people", this.defaultSchema)
    expect(pk.toLowerCase()).toBe('id')

    if (!this.options.skipPkQuote) {
      pk = await this.connection.getPrimaryKey("tablewith'char", this.defaultSchema)
      expect(pk).toBe("one")
    }

    const rawPkres = await this.connection.getPrimaryKeys('with_composite_pk', this.defaultSchema)
    const pkres = rawPkres.map((key) => key.columnName.toLowerCase());
    expect(pkres).toEqual(expect.arrayContaining(["id1", "id2"]))
  }

  async queryTests() {
    await this.connection.executeQuery('create table one_record(one integer)')
    await this.connection.executeQuery('insert into one_record values(1)')

    const tables = await this.connection.listTables({ schema: this.defaultSchema})

    expect(tables.map((t) => t.name.toLowerCase())).toContain('one_record')

    const q = await this.connection.query(
      this.dbType === 'firebird' ?
        "select trim('a') as total, trim('b') as total from rdb$database" :
        "select 'a' as total, 'b' as total from one_record"
    )
    if(!q) throw new Error("no query result")
    try {
      const result = await q.execute()

      expect(result[0].rows).toMatchObject([{ c0: "a", c1: "b" }])
      // oracle upcases everything
      const fields = result[0].fields.map((f: any) => ({id: f.id, name: f.name.toLowerCase()}))

      let expected = [{id: 'c0', name: 'total'}, {id: 'c1', name: 'total'}]

      // FYI node-oracledb 5+ renames duplicate columns for reasons I can't explain,
      // so we need to do a special check here
      if (this.dbType === 'oracle') {
        expected = [{ id: 'c0', name: 'total' }, { id: 'c1', name: 'total_1' }]
      }

       expect(fields).toMatchObject(expected)

    } catch (ex) {
      console.error("QUERY FAILED", ex)
      throw ex
    }

    const q2 = await this.connection.query(
      this.dbType === 'firebird' ?
        "select trim('a') as a from rdb$database; select trim('b') as b from rdb$database" :
        "select 'a' as a from one_record; select 'b' as b from one_record"
    );
    if (!q2) throw "No query result"
    const r2 = await q2.execute()
    expect(r2[0].rows).toMatchObject([{c0: "a"}])
    expect(r2[1].rows).toMatchObject([{c0: 'b'}])
    expect(r2[0].fields.map((f: any) => [f.id, f.name.toLowerCase().toLowerCase()])).toMatchObject([['c0', 'a']])
    expect(r2[1].fields.map((f: any) => [f.id, f.name.toLowerCase().toLowerCase()])).toMatchObject([['c0', 'b']])

  }

  async getInsertQueryTests() {
    const row = { job_name: "Programmer", hourly_rate: 41 }
    const tableInsert = { table: 'jobs', schema: this.defaultSchema, data: [row] }
    const insertQuery = await this.connection.getInsertQuery(tableInsert)
    const expectedQueries = {
      postgresql: `insert into "public"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
      mysql: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      tidb: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      mariadb: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      sqlite: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      libsql: "insert into `jobs` (`hourly_rate`, `job_name`) values (41, 'Programmer')",
      sqlserver: "insert into [dbo].[jobs] ([hourly_rate], [job_name]) values (41, 'Programmer')",
      cockroachdb: `insert into "public"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
      firebird: "insert into jobs (hourly_rate, job_name) values (41, 'Programmer')",
      oracle: `insert into "BEEKEEPER"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
    }

    expect(insertQuery).toBe(expectedQueries[this.dbType])
  }

  async buildCreatePrimaryKeysAndAutoIncrementTests() {
    const generator = new SqlGenerator(this.dialect, {
      dbConfig: this.connection.server.config,
      dbName: this.connection.database.database,
    })
    const schema: Schema = {
      name: 'test_table',
      columns: [{
        columnName: 'id',
        dataType: 'autoincrement',
        primaryKey: true,
        nullable: false,
      }],
    }
    const query = generator.buildSql(schema)
    const expectedQueries: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `create table "test_table" ("id" serial not null, constraint "test_table_pkey" primary key ("id"))`,
      mysql: "create table `test_table` (`id` int unsigned not null, primary key (`id`)); alter table `test_table` modify column `id` int unsigned not null auto_increment",
      sqlite: "create table `test_table` (`id` integer not null primary key autoincrement, unique (`id`))",
      sqlserver: "CREATE TABLE [test_table] ([id] int identity(1,1) not null, CONSTRAINT [test_table_pkey] PRIMARY KEY ([id]))",
      cockroachdb: `create table "test_table" ("id" serial not null, constraint "test_table_pkey" primary key ("id"))`,
      firebird: `create table test_table (id integer not null primary key);alter table test_table add constraint test_table_pkey primary key (id)`,
      oracle: `create table "test_table" ("id" integer not null); DECLARE PK_NAME VARCHAR(200); BEGIN  EXECUTE IMMEDIATE ('CREATE SEQUENCE "test_table_seq"'); SELECT cols.column_name INTO PK_NAME  FROM all_constraints cons, all_cons_columns cols  WHERE cons.constraint_type = 'P'  AND cons.constraint_name = cols.constraint_name  AND cons.owner = cols.owner  AND cols.table_name = 'test_table';  execute immediate ('create or replace trigger "test_table_autoinc_trg"  BEFORE INSERT on "test_table"  for each row  declare  checking number := 1;  begin    if (:new."' || PK_NAME || '" is null) then      while checking >= 1 loop        select "test_table_seq".nextval into :new."' || PK_NAME || '" from dual;        select count("' || PK_NAME || '") into checking from "test_table"        where "' || PK_NAME || '" = :new."' || PK_NAME || '";      end loop;    end if;  end;'); END; alter table "test_table" add constraint "test_table_pkey" primary key ("id")`,
    }
    const expectedQuery = expectedQueries[this.dbType] || expectedQueries[this.dialect]
    expect(this.fmt(query)).toBe(this.fmt(expectedQuery))
  }

  async buildSelectTopQueryTests() {
    const query = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [{ field: 'hourly_rate', dir: 'ASC' }],
      [{ field: 'job_name', type: 'in', value: ['Programmer', "Surgeon's Assistant"] }],
      'public',
      ['*']
    )
    const expectedQueries: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `job_name` IN ('Programmer','Surgeon\\'s Assistant') ORDER BY `hourly_rate` ASC LIMIT 100 OFFSET 0",
      sqlite: "SELECT * FROM `jobs` WHERE `job_name` IN ('Programmer','Surgeon''s Assistant') ORDER BY `hourly_rate` ASC LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [public].[jobs] WHERE [job_name] IN ('Programmer','Surgeon''s Assistant') ORDER BY [hourly_rate] ASC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE job_name IN ('Programmer','Surgeon''s Assistant') ORDER BY hourly_rate ASC",
      oracle: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`
    }
    const expectedQuery = expectedQueries[this.dbType] || expectedQueries[this.dialect]
    expect(this.fmt(query)) .toBe(this.fmt(expectedQuery))

    const multipleFiltersQuery = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [{ field: 'hourly_rate', dir: 'ASC' }],
      [
        { field: 'job_name', type: 'in', value: ['Programmer', "Surgeon's Assistant"] },
        { op: "AND", field: 'hourly_rate', type: '>=', value: '41' },
        { op: "OR", field: 'hourly_rate', type: '>=', value: '31' },
      ],
      'public',
      ['*']
    )
    const expectedFiltersQueries: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
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
      oracle: `
        SELECT
          *
        FROM
          "public"."jobs"
        WHERE
          "job_name" IN ('Programmer', 'Surgeon''s Assistant')
          AND "hourly_rate" >= '41'
          OR "hourly_rate" >= '31'
        ORDER BY
          "hourly_rate" ASC
        OFFSET
          0 ROWS
        FETCH NEXT
          100 ROWS ONLY
      `
    }
    const expectedFiltersQuery = expectedFiltersQueries[this.dbType] || expectedFiltersQueries[this.dialect]
    expect(this.fmt(multipleFiltersQuery)).toBe(this.fmt(expectedFiltersQuery))
  }

  async buildIsNullTests() {
    const queryIsNull = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [],
      [{ field: 'hourly_rate', type: 'is' }],
      ['sqlserver', 'oracle'].includes(this.dbType) ? null : 'public',
      ['*']
    );

    const expectedQueriesIsNull: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NULL LIMIT 100 OFFSET 0",
      sqlite: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NULL LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [jobs] WHERE [hourly_rate] IS NULL ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE hourly_rate IS NULL",
      oracle: `SELECT * FROM "jobs" WHERE "hourly_rate" IS NULL OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`,
    }
    const expectedQueryIsNull = expectedQueriesIsNull[this.dbType] || expectedQueriesIsNull[this.dialect]
    expect(this.fmt(queryIsNull)).toBe(this.fmt(expectedQueryIsNull))

    await expect(this.connection.executeQuery(queryIsNull)).resolves.not.toThrow();

    const queryIsNotNull = await this.connection.selectTopSql(
      'jobs',
      0,
      100,
      [],
      [{ field: 'hourly_rate', type: 'is not' }],
      ['sqlserver', 'oracle'].includes(this.dbType) ? null : 'public',
      ['*']
    );

    const expectedQueriesIsNotNull: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NOT NULL LIMIT 100 OFFSET 0",
      sqlite: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NOT NULL LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [jobs] WHERE [hourly_rate] IS NOT NULL ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE hourly_rate IS NOT NULL",
      oracle: `SELECT * FROM "jobs" WHERE "hourly_rate" IS NOT NULL OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`
    }
    const expectedQueryIsNotNull = expectedQueriesIsNotNull[this.dbType] || expectedQueriesIsNotNull[this.dialect]
    expect(this.fmt(queryIsNotNull)).toBe(this.fmt(expectedQueryIsNotNull))

    await expect(this.connection.executeQuery(queryIsNotNull)).resolves.not.toThrow();
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
        columns: [{ name: 'index_me', order: 'ASC' }],
        unique: undefined
      }]
    })
    const indexes = await this.connection.listTableIndexes('index_test', this.defaultSchema)
    expect(indexes.map((i) => i.name.toLowerCase())).toContain('it_idx')
    await this.connection.alterIndex({
      drops: [{ name: 'it_idx' }],
      additions: [{ name: 'it_idx2', columns: [{ name: 'me_too', order: 'ASC'}], unique: undefined }],
      table: 'index_test',
      schema: this.defaultSchema
    })
    const updatedIndexesRaw: TableIndex[] = await this.connection.listTableIndexes('index_test', this.defaultSchema)

    const updatedIndexes = updatedIndexesRaw.filter((i) => !i.primary)

    // gotta discard automatic indexes for oracle on the primary key
    const picked = updatedIndexes
      .map((i) => _.pick(i, ['name', 'columns', 'table', 'schema']))
      .filter((index) => this.dialect !== 'oracle' || !index.name.startsWith('SYS_'))
      .filter((index) => this.dbType !== 'cockroachdb' || !index.name.endsWith('pkey'))
    const schemaDefault = this.defaultSchema ? { schema: this.defaultSchema } : {}
    expect(picked).toMatchObject(
      [
        {
        ...schemaDefault,
        name: this.dbType === 'firebird' ? 'IT_IDX2' : 'it_idx2',
        columns: [{name: this.dbType === 'firebird' ? 'ME_TOO' : 'me_too' , order: 'ASC'}],
        table: this.dbType  === 'firebird' ? 'INDEX_TEST' : 'index_test' ,
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

    if (this.dbType === 'firebird') {
      for (const name of names) {
        await this.knex('streamtest').insert(name)
      }
    } else {
      await this.knex('streamtest').insert(names)
    }
    const result = await this.connection.selectTopStream(
      'streamtest',
      [{ field: 'id', dir: 'ASC' }],
      [],
      5,
      undefined,
    )
    expect(result.columns.map(c => c.columnName.toLowerCase())).toMatchObject(['id', 'name'])
    if (this.connection.connectionType !== 'tidb') {
      // tiDB doesn't always update statistics, so this might not
      // be correct
      expect(result.totalRows).toBe(6)
    }
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

  async generatedColumnsTests() {
    if (this.options.skipGeneratedColumns) return

    const columns = await this.connection.listTableColumns('with_generated_cols', this.defaultSchema)
    expect(columns.map((c) => _.pick(c, ["columnName", "generated"]))).toEqual([
      { columnName: "id", generated: false },
      { columnName: "first_name", generated: false },
      { columnName: "last_name", generated: false },
      { columnName: "full_name", generated: true },
    ]);

    const rows = await this.connection.selectTop('with_generated_cols', 0, 10, [], [], this.defaultSchema)
    expect(rows.result.map((r) => r.full_name)).toEqual(['Tom Tester'])
  }

  async importScriptsTests({ tableName, table, formattedData, importScriptOptions, hatColumn }) {
    // cassandra and big query don't allow import so no need to test!
    // oracle doesn't want to find the table, so it doesn't get to have nice things
    if (['cassandra', 'bigquery', 'oracle'].includes(this.dialect)) {
      return expect.anything()
    }

    const importSQL = await this.connection.getImportSQL(formattedData)
    importScriptOptions.clientExtras = await this.connection.importStepZero(table)
    await this.connection.importBeginCommand(table, importScriptOptions)
    await this.connection.importTruncateCommand(table, importScriptOptions)
    
    const editedImportScriptOptions = {
      clientExtras: importScriptOptions.clientExtras,
      executeOptions: { multiple: true } 
    }
    
    await this.connection.importLineReadCommand(table, importSQL, editedImportScriptOptions)
    
    await this.connection.importCommitCommand(table, importScriptOptions)
    await this.connection.importFinalCommand(table, importScriptOptions)

    const [hats] = await this.knex(tableName).count(hatColumn)
    const [dataLength] = _.values(hats)
    expect(Number(dataLength)).toBe(4)
  }

  async importScriptRollbackTest({ tableName, table, formattedData, importScriptOptions, hatColumn }) {
    // cassandra and big query don't allow import so no need to test!
    // mysql was added to the list because a timeout was required to get the rollback number ot show
    // and that was causing connections to break in the tests which is a bad day ¯\_(ツ)_/¯
    let expectedLength = 0
    if (['cassandra','bigquery', 'mysql', 'oracle'].includes(this.dialect)) {
      return expect.anything()
    }

    if (['sqlite'].includes(this.dialect)) {
      expectedLength = 4
    }

    const importSQL = await this.connection.getImportSQL(formattedData)

    importScriptOptions.clientExtras = await this.connection.importStepZero(table)
    await this.connection.importBeginCommand(table, importScriptOptions)
    await this.connection.importTruncateCommand(table, importScriptOptions)

    const editedImportScriptOptions = {
      clientExtras: importScriptOptions.clientExtras,
      executeOptions: { multiple: true } 
    }

    await this.connection.importLineReadCommand(table, importSQL, editedImportScriptOptions)
    
    await this.connection.importRollbackCommand(table, importScriptOptions)
    await this.connection.importFinalCommand(table, importScriptOptions)

    const [hats] = await this.knex(tableName).count(hatColumn)
    const [dataLength] = _.values(hats)
    expect(Number(dataLength)).toBe(expectedLength)
  }

  private async createTables() {

    const primary = (table: Knex.CreateTableBuilder) => {
      if (this.dbType === 'firebird') {
        table.specificType('id', 'integer generated by default as identity primary key')
      } else {
        table.increments().primary()
      }
    }

    await this.knex.schema.createTable('addresses', (table) => {
      primary(table)
      table.timestamps(true)
      table.string("street")
      table.string("city")
      table.string("state")
      table.string("country").notNullable()
    })

    // FIXME: Knex doesn't support tables with dots in the name
    // https://github.com/knex/knex/issues/2762
    // Should be used in the dot table tests
    // await this.knex.schema.createTable(knex.raw('`foo.bar`'), (table) => {
    //   table.integer('id')
    //   table.string('name')
    // })

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
      table.timestamps(true)
      table.string("firstname")
      table.string("lastname")
      table.string("email").notNullable()
      table.integer("address_id").notNullable().unsigned()
      table.foreign("address_id").references("addresses.id")
    })

    await this.knex.schema.createTable("jobs", (table) => {
      primary(table)
      table.timestamps(true)
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
      table.timestamps(true)
    })

    await this.knex.schema.createTable('with_composite_pk', (table) => {
      table.integer("id1").notNullable().unsigned()
      table.integer("id2").notNullable().unsigned()
      table.primary(["id1", "id2"])
    })

    // Firebird doesn't support special chars in identifiers except $ and _
    if (this.dbType !== 'firebird') {
      await this.knex.schema.createTable("tablewith'char", (table) => {
        table.integer("one").unsigned().notNullable().primary()
      })
    }

    await this.knex.schema.createTable('streamtest', (table) => {
      primary(table)
      table.string("name")
    })

    if (!this.options.skipGeneratedColumns) {
      const generatedDefs: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery' | 'firebird'> = {
        sqlite: "TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
        mysql: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        tidb: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        mariadb: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        sqlserver: "AS (first_name + ' ' + last_name) PERSISTED",
        oracle: `VARCHAR2(511) GENERATED ALWAYS AS ("first_name" || ' ' || "last_name")`,
        postgresql: "VARCHAR(511) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
        cockroachdb: "VARCHAR(511) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
      }
      const generatedDef = generatedDefs[this.dbType] || generatedDefs[this.dialect]
      await this.knex.schema.createTable('with_generated_cols', (table) => {
        table.integer('id').primary()
        table.string('first_name')
        table.string('last_name')
        table.specificType('full_name', generatedDef)
      })
    }
  }

  async databaseVersionTest() {
    const version = await this.connection.versionString();
    expect(version).toBeDefined()
  }
}
