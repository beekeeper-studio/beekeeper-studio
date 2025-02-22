import {Knex} from 'knex'
import knex from 'knex'
import { ConnectionType, DatabaseElement, IDbConnectionServerConfig } from '../../src/lib/db/types'
import log from '@bksLogger'
import platformInfo from '../../src/common/platform_info'
import { AlterTableSpec, Dialect, DialectData, dialectFor, FormatterDialect, Schema, SchemaItemChange } from '@shared/lib/dialects/models'
import { getDialectData } from '@shared/lib/dialects/'
import _ from 'lodash'
import { TableIndex, TableOrView } from '../../src/lib/db/models'
export const dbtimeout = 120000
import '../../src/common/initializers/big_int_initializer.ts'
import { safeSqlFormat } from '../../src/common/utils'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { SqlGenerator } from '@shared/lib/sql/SqlGenerator'
import { Client_DuckDB } from '@shared/lib/knex-duckdb'
import { IDbConnectionPublicServer } from './db/serverTypes'
// TODO (@day): this may need to be moved uggh
import { createServer } from '@commercial/backend/lib/db/server'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { FirebirdData } from '@/shared/lib/dialects/firebird'
import { LicenseKey } from '@/common/appdb/models/LicenseKey'
import { TestOrmConnection } from './TestOrmConnection'
import { buffer as b, uint8 as u } from '@tests/utils'
import Client_Oracledb from '@shared/lib/knex-oracledb'
import Client_Firebird from '@shared/lib/knex-firebird'
import { DuckDBBlobValue } from '@duckdb/node-api'

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
  "firebird": Client_Firebird,
  "oracle": Client_Oracledb,
  "duckdb": Client_DuckDB,
}

export interface Options {
  dialect: Dialect,
  defaultSchema?: string
  version?: string,
  skipPkQuote?: boolean
  /** Skip creation of table with generated columns and the tests */
  skipGeneratedColumns?: boolean
  skipCreateDatabase?: boolean
  skipTransactions?: boolean
  supportsArrayMode?: boolean
  knexConnectionOptions?: Record<string, any>
  beforeCreatingTables?: () => void | Promise<void>
  /**
   * If this is true, then tests will use knex instance from the client class.
   *
   * For databases like DuckDB, there should be only one process that can both
   * read and write to the database.
   **/
  singleClient?: boolean
  knex?: Knex
  knexClient?: Knex.Client
  queryTestsTableCreationQuery?: string
}

export class DBTestUtil {
  public knex: Knex
  public server: IDbConnectionPublicServer
  public connection: BasicDatabaseClient<any>
  public extraTables = 0
  public options: Options
  private dbType: ConnectionType | 'generic'
  public databaseName: string

  public dialect: Dialect
  public data: DialectData

  public preInitCmd: string | undefined
  public defaultSchema: string = undefined

  private personId: number
  private jobId: number

  get expectedTables() {
    return this.extraTables + 8
  }

  get supportsArrayMode() {
    return this.options.supportsArrayMode == undefined || this.options.supportsArrayMode
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
    this.databaseName = database

    if (options.knex) {
      this.knex = options.knex
    } else if (config.client === 'sqlite' || config.client === 'duckdb') {
      this.knex = knex({
        client: KnexTypes[config.client],
        connection: {
          filename: database
        }
      })
    } else if (config.client === 'oracle') {
      this.knex = knex({
        client: Client_Oracledb,
        connection: {
          user: config.user,
          password: config.password,
          connectString: `${config.host}:${config.port}/${config.serviceName}`,
          requestTimeout: 1000
        }
      })
    } else {
      this.knex = knex({
        client: options.knexClient || KnexTypes[config.client || ""] || config.client,
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
    await TestOrmConnection.disconnect()
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

  async connect() {
    await TestOrmConnection.connect()
    await LicenseKey.createTrialLicense()
    await this.connection.connect()
    if (this.options.singleClient) {
      this.knex = this.connection.knex
    }

  }

  async setupdb() {
    await this.connect()
    await this.options.beforeCreatingTables?.()
    await this.createTables()

    const address = this.maybeArrayToObject(await this.knex("addresses").insert({country: "US"}).returning("id"), 'id')
    const isOracle = this.connection.connectionType === 'oracle'
    await this.knex("MixedCase").insert({bananas: "pears"}).returning("id")
    let people = this.maybeArrayToObject(await this.knex("people").insert({ email: "foo@bar.com", address_id: address[0].id}).returning("id"), 'id')
    let jobs = this.maybeArrayToObject(await this.knex("jobs").insert({job_name: "Programmer"}).returning("id"), 'id')

    if (this.dialect === 'clickhouse') {
      people = (await this.knex("people").select("id").where({email: "foo@bar.com"}))[0]
      jobs = (await this.knex("jobs").select("id").where({job_name: "Programmer"}))[0]
    }

    // Oracle or Knex has decided in its infinite wisdom to return the ids as strings, so make em numbers for the id because that's what they are in the table itself.
    this.jobId = isOracle ? Number(jobs[0].id) : jobs[0].id
    this.personId = isOracle ? Number(people[0].id) : people[0].id
    await this.knex("people_jobs").insert({job_id: this.jobId, person_id: this.personId })

    // See createTables for why this is commented out
    // await this.knex("foo.bar").insert({ id: 1, name: "Dots are evil" });


    if (!this.data.disabledFeatures.generatedColumns && !this.options.skipGeneratedColumns) {
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
    const createdDbName = await this.connection.createDatabase('new-db_2', charset, collation)

    if (this.dialect.match(/sqlite|firebird|duckdb/)) {
      const connection = this.server.createConnection(createdDbName)
      await expect(connection.connect()).resolves.not.toThrow()
      await connection.disconnect()
      return
    }
    const newDBsCount = await this.connection.listDatabases()

    expect(dbs.length).toBeLessThan(newDBsCount.length)
  }

  async badCreateDatabaseTests() {
    // sqlserver seems impervious to bad database names or bad charsets or anything.
    if (this.dbType === 'sqlserver' || this.dbType === 'clickhouse') {
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
    let newRowCount = await this.knex.select().from('group_table')
    // For whatever reason clickhouse knex returns the whole meta info instead
    // of just the row data like normal knex
    if (this.dbType === 'clickhouse') {
      newRowCount = newRowCount[0]
    }

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

  async listIndexTests() {
    const indexes = await this.connection.listTableIndexes("has_index", this.defaultSchema)
    expect(indexes.find((i) => i.name.toLowerCase() === 'has_index_foo_idx')).toBeDefined()
  }

  async tableColumnsTests() {
    const columns = await this.connection.listTableColumns(null, this.defaultSchema)
    const mixedCaseColumns = await this.connection.listTableColumns('MixedCase', this.defaultSchema)
    const defaultValues = mixedCaseColumns.map(r => r.hasDefault)
    const trueFalseDBs = ['mariadb', 'mysql', 'tidb', 'cockroachdb', 'postgresql', 'duckdb']

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
      table.specificType("id", 'varchar(255)').notNullable().primary()
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
        table.specificType("id", 'varchar(255)').notNullable().primary()
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
          newValue: this.dialect === 'clickhouse' ? 'Nullable(String)' : 'varchar(256)'
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
      defaultValue: string | number,
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
      if (this.dialect === 'sqlserver') return `('${s.toString().replaceAll("'", "''")}')`
      if (this.dialect === 'clickhouse') return `'${s.toString().replaceAll("'", "\\'")}'`
      if (/oracle|firebird|duckdb/.test(this.dialect)) return `'${s.toString().replaceAll("'", "''")}'`
      return s.toString()
    }

    const tbl = (o: Record<keyof MiniColumn, any>) => {
      let columnName = o.columnName
      let dataType = o.dataType

      if (this.dbType === 'firebird') {
        columnName = columnName.toUpperCase()
        dataType = dataType.toUpperCase()
      } else if (this.dialect === 'oracle') {
        dataType = dataType.replace('varchar', 'VARCHAR2')
      } else if (this.dialect === 'clickhouse') {
        dataType = o.nullable ? 'Nullable(String)' : 'String'
      } else if (this.dialect === 'duckdb' && o.dataType.includes('varchar')) {
        dataType = 'VARCHAR'
      }

      return {
        columnName,
        dataType,
        nullable: o.nullable,
        defaultValue: defaultValue(o.defaultValue),
      }
    }


    const expected = [
      tbl({
        columnName: 'id',
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: null,
      }),
      tbl({
        columnName: 'first_name',
        dataType: 'varchar(256)',
        nullable: true,
        defaultValue: "Foo'bar",
      }),
      tbl({
        columnName: 'family_name',
        dataType: 'varchar(255)',
        nullable: false,
        defaultValue: 'Rath\'bone',
      }),
      tbl({
        columnName: 'age',
        dataType: 'varchar(256)',
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
        table.increments('id').primary()
      })

      await this.connection.setElementName('rename_table', 'renamed_table', DatabaseElement.TABLE, this.defaultSchema)

      expect((await this.connection.listTables()).map((t) => t.name)).toContain('renamed_table')
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

    const row = rowobj(r.result)[0]
    // integer equality tests need additional logic for sqlite's BigInts (Issue #1399)
    expect(row.person_id).toEqual(this.dialect === 'sqlite' ? BigInt(this.personId) : this.personId)
    expect(row.job_id).toEqual(this.dialect === 'sqlite' ? BigInt(this.jobId) : this.jobId)
    expect(row.created_at).toBeDefined()
    expect(row.updated_at).toBeDefined()

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
    await this.connection.executeQuery(this.options.queryTestsTableCreationQuery || 'create table one_record(one integer primary key)')
    await this.connection.executeQuery('insert into one_record values(1)')

    const tables = await this.connection.listTables({ schema: this.defaultSchema})

    expect(tables.map((t) => t.name.toLowerCase())).toContain('one_record')

    const sql1 = {
      common: "select 'a' as total, 'b' as total from one_record",
      firebird: "select trim('a') as total, trim('b') as total from rdb$database",
      // Clickhouse doesn't support same column name
      clickhouse: "select 'a' as total, 'b' as total2 from one_record",
    }
    const q = await this.connection.query(sql1[this.dialect] || sql1.common)
    if(!q) throw new Error("no query result")
    try {
      const result = await q.execute()

      // FIXME (azmi): we need this until array mode is fixed in libsql
      if (this.supportsArrayMode) {
        expect(result[0].rows).toMatchObject([{ c0: "a", c1: "b" }])
      } else {
        expect(result[0].rows).toMatchObject([{ c0: "b" }])
      }
      // oracle upcases everything
      const fields = result[0].fields.map((f: any) => ({id: f.id, name: f.name.toLowerCase()}))
      const expectedResults = {
        common: [{id: 'c0', name: 'total'}, {id: 'c1', name: 'total'}],
        noArrayMode: [{ id: 'c0', name: 'total' }],
        clickhouse: [{id: 'c0', name: 'total'}, {id: 'c1', name: 'total2'}],
        oracle: [{ id: 'c0', name: 'total' }, { id: 'c1', name: 'total_1' }],
        duckdb: [{id: 'c0', name: 'total'}, {id: 'c1', name: 'total'}],
      }
      expect(fields).toMatchObject(expectedResults[this.dialect] || (this.supportsArrayMode ? expectedResults.common : expectedResults.noArrayMode))
    } catch (ex) {
      console.error("QUERY FAILED", ex)
      throw ex
    }

    if (this.data.disabledFeatures?.alter?.multiStatement) {
      return;
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
    const isFirebird = this.dbType === 'firebird'
    const isClickhouse = this.dbType === 'clickhouse'
    const row = { job_name: "Programmer", hourly_rate: 41 }
    const initialID = this.dialect === 'sqlite' ? BigInt(this.jobId) : this.jobId
    const secondID = Number(initialID) + 1
    const thirdID = Number(initialID) + 2
    const tableInsert = { table: 'jobs', schema: this.defaultSchema, data: [row] }
    const upsertRow = isFirebird ? {
      ID: initialID,
      ...row
    } : {
      id: initialID,
      ...row
    }
    const tableUpsert = { table: 'jobs', schema: this.defaultSchema, data: [ upsertRow ] }
    const tableMultipleUpsert = { table: 'jobs', schema: this.defaultSchema, data: [
      upsertRow,
      { id: secondID, job_name: "Blerk", hourly_rate: 40 },
      { id: thirdID, job_name: "blarns", hourly_rate: 39}
    ] }
    const insertQuery = await this.connection.getInsertQuery(tableInsert)
    const upsertQuery = isClickhouse ? '' : await this.connection.getInsertQuery(tableUpsert, true)
    const multipleUpsertQuery = isFirebird || isClickhouse ? '' : await this.connection.getInsertQuery(tableMultipleUpsert, true)

    const expectedInsertQueries = {
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
      duckdb: `insert into "main"."jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
      clickhouse: `insert into "jobs" ("hourly_rate", "job_name") values (41, 'Programmer')`,
    }
    // sqlserver needs some serious custom sql to get that working. Knex, like the goggles, does nothing
    const expectedUpsertQueries = {
      postgresql: `insert into "public"."jobs" ("hourly_rate", "id", "job_name") values (41, ${initialID}, 'Programmer') on conflict ("id") do update set "hourly_rate" = excluded."hourly_rate", "id" = excluded."id", "job_name" = excluded."job_name"`,
      cockroachdb: `insert into "public"."jobs" ("hourly_rate", "id", "job_name") values (41, '${initialID}', 'Programmer') on conflict ("id") do update set "hourly_rate" = excluded."hourly_rate", "id" = excluded."id", "job_name" = excluded."job_name"`, // pg based
      mysql: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID + ", 'Programmer') on duplicate key update `hourly_rate` =  values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)",
      tidb: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID + ", 'Programmer') on duplicate key update `hourly_rate` =  values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)", // mysql based
      mariadb: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID + ", 'Programmer') on duplicate key update `hourly_rate` =  values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)", // mysql based
      sqlite: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, '" + initialID + "', 'Programmer') on conflict (`id`) do update set `hourly_rate` = excluded.`hourly_rate`, `id` = excluded.`id`, `job_name` = excluded.`job_name`",
      libsql: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, '" + initialID + "', 'Programmer') on conflict (`id`) do update set `hourly_rate` = excluded.`hourly_rate`, `id` = excluded.`id`, `job_name` = excluded.`job_name`", // sqlite based
      clickhouse: '',
      duckdb: "INSERT OR REPLACE `jobs`, (`id`, `job_name`, `hourly_rate`) VALUES ('1', 'Programmer', '41')",
      sqlserver: `
        MERGE INTO [dbo].[jobs] AS target
        USING (VALUES
          (${initialID}, 'Programmer', 41)
        ) AS source ([id], [job_name], [hourly_rate])
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            target.[job_name] = source.[job_name],
            target.[hourly_rate] = source.[hourly_rate]
        WHEN NOT MATCHED THEN
          INSERT ([id], [job_name], [hourly_rate])
          VALUES (source.[id], source.[job_name], source.[hourly_rate]);
      `,
      firebird: `
      MERGE INTO "jobs" AS target
      USING (
        SELECT ${initialID} AS "ID", 'Programmer' AS "job_name", 41 AS "hourly_rate" FROM RDB$DATABASE
      ) AS source
      ON (target."ID" = source."ID")
      WHEN MATCHED THEN
        UPDATE SET
          "job_name" = source."job_name", "hourly_rate" = source."hourly_rate"
      WHEN NOT MATCHED THEN
        INSERT ("ID", "job_name", "hourly_rate")
      VALUES (source."ID", source."job_name", source."hourly_rate");`.trim(),
      oracle: `
      MERGE INTO "BEEKEEPER"."jobs" target
      USING (
        SELECT
          ${initialID} AS "id", 'Programmer' AS "job_name", 41 AS "hourly_rate" FROM dual
      ) source ON (target."id" = source."id")
      WHEN MATCHED THEN
        UPDATE SET
          target."job_name" = source."job_name", target."hourly_rate" = source."hourly_rate"
      WHEN NOT MATCHED THEN
        INSERT ("id", "job_name", "hourly_rate")
        VALUES (source."id", source."job_name", source."hourly_rate");`,
    }
    const expectedMultipleUpsertQueries = {
      postgresql: `insert into "public"."jobs" ("hourly_rate", "id", "job_name") values (41, ${initialID}, 'Programmer'), (40, ${secondID}, 'Blerk'), (39, ${thirdID}, 'blarns') on conflict ("id") do update set "hourly_rate" = excluded."hourly_rate", "id" = excluded."id", "job_name" = excluded."job_name"`,
      cockroachdb: `insert into "public"."jobs" ("hourly_rate", "id", "job_name") values (41, '${initialID}', 'Programmer'), (40, ${secondID}, 'Blerk'), (39, ${thirdID}, 'blarns') on conflict ("id") do update set "hourly_rate" = excluded."hourly_rate", "id" = excluded."id", "job_name" = excluded."job_name"`, // pg based
      mysql: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID +", 'Programmer'), (40, "+ secondID +", 'Blerk'), (39, "+ thirdID +", 'blarns') on duplicate key update `hourly_rate` = values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)",
      tidb: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID +", 'Programmer'), (40, "+ secondID +", 'Blerk'), (39, "+ thirdID +", 'blarns') on duplicate key update `hourly_rate` = values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)", // mysql based
      mariadb: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) values (41, "+ initialID +", 'Programmer'), (40, "+ secondID +", 'Blerk'), (39, "+ thirdID +", 'blarns') on duplicate key update `hourly_rate` = values (`hourly_rate`), `id` = values (`id`), `job_name` = values (`job_name`)", // mysql based
      sqlite: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) select 41 as `hourly_rate`, '" + initialID + "' as `id`, 'Programmer' as `job_name` union all select 40 as `hourly_rate`, " + secondID + " as `id`, 'Blerk' as `job_name` union all select 39 as `hourly_rate`, " + thirdID + " as `id`, 'blarns' as `job_name` where true on conflict (`id`) do update set `hourly_rate` = excluded.`hourly_rate`, `id` = excluded.`id`, `job_name` = excluded.`job_name`",
      libsql: "insert into `jobs` (`hourly_rate`, `id`, `job_name`) select 41 as `hourly_rate`, '" + initialID + "' as `id`, 'Programmer' as `job_name` union all select 40 as `hourly_rate`, " + secondID + " as `id`, 'Blerk' as `job_name` union all select 39 as `hourly_rate`, " + thirdID + " as `id`, 'blarns' as `job_name` where true on conflict (`id`) do update set `hourly_rate` = excluded.`hourly_rate`, `id` = excluded.`id`, `job_name` = excluded.`job_name`", // sqlite based
      duckdb: "INSERT OR REPLACE `jobs`, (`id`, `job_name`, `hourly_rate`) VALUES ('1', 'Programmer', '41'), ('2', 'Blerk', '40'), ('3', 'blarns', '39')",
      sqlserver: `
      MERGE INTO [dbo].[jobs] AS target
      USING (VALUES
        (${initialID}, 'Programmer', 41),
        (${secondID}, 'Blerk', 40),
        (${thirdID}, 'blarns', 39)
      ) AS source ([id], [job_name], [hourly_rate])
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET
          target.[job_name] = source.[job_name],
          target.[hourly_rate] = source.[hourly_rate]
      WHEN NOT MATCHED THEN
        INSERT ([id], [job_name], [hourly_rate])
        VALUES (source.[id], source.[job_name], source.[hourly_rate]);
      `,
      firebird: '',
      clickhouse: '',
      oracle: `
      MERGE INTO "BEEKEEPER"."jobs" target
      USING (
        SELECT ${initialID} AS "id", 'Programmer' AS "job_name", 41 AS "hourly_rate" FROM dual
        UNION ALL
        SELECT ${secondID}, 'Blerk', 40 FROM dual
        UNION ALL
        SELECT ${thirdID}, 'blarns', 39 FROM dual
      ) source ON (target."id" = source."id")
      WHEN MATCHED THEN
        UPDATE SET
          target."job_name" = source."job_name",
          target."hourly_rate" = source."hourly_rate"
      WHEN NOT MATCHED THEN
        INSERT ("id", "job_name", "hourly_rate")
        VALUES (source."id", source."job_name", source."hourly_rate");`,
    }

    expect(insertQuery).toBe(expectedInsertQueries[this.dbType] ?? insertQuery)
    expect(this.fmt(upsertQuery)).toBe(this.fmt(expectedUpsertQueries[this.dbType]) ?? this.fmt(upsertQuery))
    expect(this.fmt(multipleUpsertQuery)).toBe(this.fmt(expectedMultipleUpsertQueries[this.dbType]) ?? this.fmt(upsertQuery))
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
      duckdb: `create table "test_table" ("id" integer not null, primary key ("id")); create sequence "test_table_seq_id" start 1; alter table "test_table" alter column "id" set default nextval('test_table_seq_id')`,
      clickhouse: `create table "my_database"."test_table" ("id" integer, primary key ("id")) engine = MergeTree()`,
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
      oracle: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`,
      duckdb: `SELECT * FROM "public"."jobs" WHERE "job_name" IN ('Programmer','Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
      clickhouse: `SELECT * FROM "jobs" WHERE "job_name" IN ('Programmer', 'Surgeon''s Assistant') ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0`,
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
        SELECT * FROM "public"."jobs"
        WHERE "job_name" IN ('Programmer', 'Surgeon''s Assistant')
          AND "hourly_rate" >= '41'
          OR "hourly_rate" >= '31'
        ORDER BY "hourly_rate" ASC
        OFFSET 0 ROWS
        FETCH NEXT 100 ROWS ONLY
      `,
      duckdb: `
        SELECT * FROM "public"."jobs"
          WHERE "job_name" IN ('Programmer','Surgeon''s Assistant')
            AND "hourly_rate" >= '41'
            OR "hourly_rate" >= '31'
        ORDER BY "hourly_rate" ASC LIMIT 100 OFFSET 0
      `,
      clickhouse: `
        SELECT * FROM "jobs"
        WHERE "job_name" IN ('Programmer', 'Surgeon''s Assistant')
          AND "hourly_rate" >= '41'
          OR "hourly_rate" >= '31'
        ORDER BY "hourly_rate" ASC
        LIMIT 100 OFFSET 0
      `,
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
      this.defaultSchema,
      ['*']
    );

    const expectedQueriesIsNull: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NULL LIMIT 100 OFFSET 0",
      sqlite: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NULL LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [dbo].[jobs] WHERE [hourly_rate] IS NULL ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE hourly_rate IS NULL",
      oracle: `SELECT * FROM "BEEKEEPER"."jobs" WHERE "hourly_rate" IS NULL OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`,
      duckdb: `SELECT * FROM "main"."jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
      clickhouse: `SELECT * FROM "jobs" WHERE "hourly_rate" IS NULL LIMIT 100 OFFSET 0`,
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
      this.defaultSchema,
      ['*']
    );

    const expectedQueriesIsNotNull: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery'> = {
      postgresql: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
      mysql: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NOT NULL LIMIT 100 OFFSET 0",
      sqlite: "SELECT * FROM `jobs` WHERE `hourly_rate` IS NOT NULL LIMIT 100 OFFSET 0",
      sqlserver: "SELECT * FROM [dbo].[jobs] WHERE [hourly_rate] IS NOT NULL ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
      cockroachdb: `SELECT * FROM "public"."jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
      firebird: "SELECT FIRST 100 SKIP 0 * FROM jobs WHERE hourly_rate IS NOT NULL",
      oracle: `SELECT * FROM "BEEKEEPER"."jobs" WHERE "hourly_rate" IS NOT NULL OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`,
      duckdb: `SELECT * FROM "main"."jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
      clickhouse: `SELECT * FROM "jobs" WHERE "hourly_rate" IS NOT NULL LIMIT 100 OFFSET 0`,
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

    const idx = (arg: Pick<TableIndex, 'name' | 'columns' | 'table'>) => {
      if (this.dbType === 'firebird') {
        arg.name = arg.name.toUpperCase()
        arg.columns = arg.columns.map((c) => ({ name: c.name.toUpperCase(), order: c.order }))
        arg.table = arg.table.toUpperCase()
      } else if (this.dbType === 'duckdb') {
        // duckdb doesn't support ascending/descending index column
        arg.columns = arg.columns.map((c) => ({ name: c.name }))
      }
      if (this.data.disabledFeatures?.schema) {
        return arg
      }
      return {
        schema: this.defaultSchema,
        ...arg,
      }
    }

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

    expect(picked).toMatchObject([
      idx({
        name: 'it_idx2',
        columns: [{ name: 'me_too', order: 'ASC' }],
        table: 'index_test'
      })
    ])

  }

  async prepareStreamTests() {
    const fileLocation = path.join(__dirname, '../fixtures/organizations-100000.csv')
    if (this.dbType === 'duckdb') {
      await this.knex.schema.raw(`INSERT INTO organizations SELECT * FROM read_csv('${fileLocation}');`)
      return
    }
    return new Promise<void>(async (resolve, reject) => {
      const fileStream = fs.createReadStream(fileLocation)
      const promises = []
      const useStep = !!this.dbType.match(/firebird|sqlserver/i)

      let batch = []
      const maxBatch = this.dbType === 'firebird' ? 255 : 233

      const execBatch = async (batch: Record<string, any>[]) => {
        if (this.dbType === 'firebird') {
          const inserts = batch.reduce((str, row) => `${str}INSERT INTO organizations (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(FirebirdData.wrapLiteral).join(',')});\n`, '')
          await this.knex.schema.raw(`
            EXECUTE BLOCK AS BEGIN
              ${inserts}
            END
          `)
        } else if (this.dbType === 'sqlserver') {
          const { bindings, sql } = this.knex('organizations').insert(batch).toSQL()
          await this.knex.raw(`
            SET IDENTITY_INSERT organizations ON;
              ${sql}
            SET IDENTITY_INSERT organizations OFF;
          `, bindings)
        } else {
          await this.knex('organizations').insert(batch)
        }
      }

      Papa.parse(fileStream, {
        header: true,
        ...(useStep
          ? {
              step(results: { data: Record<string, any> }) {
                batch.push(results.data);
                if (batch.length >= maxBatch) {
                  promises.push(execBatch(batch));
                  batch = [];
                }
              },
            }
          : {
              chunk(results: { data: Record<string, any>[] }) {
                if (results.data.length === 0) {
                  return;
                }
                promises.push(execBatch(results.data));
              },
            }),
        complete() {
          // Clear up the last batch
          if (batch.length > 0) {
            promises.push(execBatch(batch));
            batch = [];
          }
          Promise.all(promises).then(() => resolve()).catch(reject);
        },
        error: (err) => reject(err),
      });
    })
  }

  async streamColumnsTest() {
    const { columns } = await this.connection.selectTopStream('organizations', [], [], 1000, this.defaultSchema)
    expect(columns.map(c => c.columnName.toLowerCase())).toMatchObject([
      'id', 'organization_id', 'name', 'website', 'country', 'description', 'founded', 'industry', 'number_of_employees',
    ])
  }

  async streamCountTest() {
    const result = await this.connection.selectTopStream('organizations', [], [], 1000, this.defaultSchema)
    expect(result.totalRows).toBe(100_000)
  }

  async streamStopTest() {
    const { cursor } = await this.connection.selectTopStream('organizations', [], [], 1000, this.defaultSchema)
    await cursor.start()
    await cursor.read()
    await cursor.close()
    // If the test runs despite closing the cursor, it wasn't closed properly.
    expect.anything()
  }

  async streamChunkTest() {
    // FIXME this is a hack to keep knex alive because of the STREAM_EXPIRED error
    // see https://github.com/libsql/knex-libsql/issues/3
    if (this.dbType === 'libsql') {
      await this.knex.schema.raw("SELECT 1;")
    }
    const chunkSize = 389
    const { cursor } = await this.connection.selectTopStream('organizations', [], [], chunkSize, this.defaultSchema)
    await cursor.start()
    const rows = await cursor.read()
    expect(rows.length).toBe(chunkSize)
    await cursor.close()
  }

  async streamReadTest() {
    // FIXME this is a hack to keep knex alive because of the STREAM_EXPIRED error
    // see https://github.com/libsql/knex-libsql/issues/3
    if (this.dbType === 'libsql') {
      await this.knex.schema.raw("SELECT 1;")
    }
    let count = 0;
    const { cursor } = await this.connection.selectTopStream('organizations', [], [], 1000, this.defaultSchema)
    await cursor.start()
    while (true) {
      const len = (await cursor.read()).length
      count += len
      if (len === 0) {
        break
      }
    }
    await cursor.close()
    expect(count).toBe(100_000)
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
    // clickhouse and duckdb have its own import command we don't support yet
    if (['cassandra', 'bigquery', 'oracle', 'clickhouse', 'duckdb'].includes(this.dialect)) {
      return expect.anything()
    }

    const read = async (_options: any, executeOptions: any) => {
      const updatedImportScriptOptions = {
        ...importScriptOptions,
        executeOptions: {
          multiple: true,
          ...executeOptions
        }
      };
      const importSQL = await this.connection.getImportSQL(formattedData, table.name, table.schema || null, true);
      await this.connection.importLineReadCommand(table, importSQL, updatedImportScriptOptions);
      return { aborted: false }
    }

    await this.connection.importFile(table, importScriptOptions, read)

    const [hats] = await this.knex(tableName).count(hatColumn)
    const [dataLength] = _.values(hats)
    expect(Number(dataLength)).toBe(4)
  }

  async importScriptRollbackTest({ tableName, table, formattedData, importScriptOptions, hatColumn }) {
    // cassandra and big query don't allow import so no need to test!
    // mysql was added to the list because a timeout was required to get the rollback number ot show
    // and that was causing connections to break in the tests which is a bad day ¯\_(ツ)_/¯
    let expectedLength = 0
    if (['cassandra','bigquery', 'mysql', 'oracle', 'clickhouse', 'duckdb'].includes(this.dialect)) {
      return expect.anything()
    }

    if (['sqlite'].includes(this.dialect)) {
      expectedLength = 4
    }
    const read = async (_options: any, executeOptions: any) => {
      const updatedImportScriptOptions = {
        ...importScriptOptions,
        executeOptions: {
          multiple: true,
          ...executeOptions
        }
      };
      const importSQL = await this.connection.getImportSQL(formattedData, table.name, table.schema || null, true);
      await this.connection.importLineReadCommand(table, importSQL, updatedImportScriptOptions);
      return { aborted: true, error: "Forced abort" }
    }

    try {
      await this.connection.importFile(table, importScriptOptions, read)
    } catch {
      // empty on purpose
    }

    const [hats] = await this.knex(tableName).count(hatColumn)
    const [dataLength] = _.values(hats)
    expect(Number(dataLength)).toBe(expectedLength)
  }

  async serializationBinary() {
    const ID = this.dbType === 'firebird' ? 'ID' : 'id'
    const BIN = this.dbType === 'firebird' ? 'BIN' : 'bin'
    const n = (i) => this.dialect === 'sqlite' ? BigInt(i) : i

    await this.knex('contains_binary').insert({ id: 1 })
    await this.knex('contains_binary').insert({ id: 2, bin: b`` })
    await this.knex('contains_binary').insert({ id: 3, bin: b`0` })
    await this.knex('contains_binary').insert({ id: 4, bin: b`deadbeef` })

    let result = await this.connection.selectTop('contains_binary', 0, 10, [{ field: ID, dir: 'ASC'}], [], this.defaultSchema, [BIN])
    expect(result.result).toMatchObject([
      { [BIN]: null },
      { [BIN]: u`` },
      { [BIN]: u`0` },
      { [BIN]: u`deadbeef` },
    ])

    result = await this.connection.selectTop('contains_binary', 3, 1, [{ field: ID, dir: 'ASC'}], [], this.defaultSchema)
    let data = result.result[0][BIN]
    expect(ArrayBuffer.isView(data)).toBe(true)
    expect(Buffer.from(data)).toEqual(b`deadbeef`)
    expect(result.fields).toEqual([
      { name: ID, bksType: 'UNKNOWN' },
      { name: BIN, bksType: 'BINARY' },
    ])

    await this.connection.applyChanges({
      inserts: [{
        table: 'contains_binary',
        schema: this.defaultSchema,
        // frontend sends binary as Uint8Array, or any TypedArray is possible
        data: [{ id: 5, bin: u`beefdeed` }],
      }],
      updates: [{
        table: 'contains_binary',
        schema: this.defaultSchema,
        primaryKeys: [{ column: ID, value: 4 }],
        column: BIN,
        value: u`eeffeeff`,
      }],
      deletes: [],
    })

    const rows = await this.knex('contains_binary').select('bin').offset(3).limit(2).orderBy(ID)
    const sanitize = (b) => b instanceof DuckDBBlobValue ? b.bytes : b
    expect(rows.map((r) => Buffer.from(sanitize(r.bin)))).toEqual([
      b`eeffeeff`,
      b`beefdeed`,
    ])
  }

  async resolveTableColumns() {
    const ID = this.dbType === 'firebird' ? 'ID' : 'id'
    const BIN = this.dbType === 'firebird' ? 'BIN' : 'bin'

    const columns = await this.connection.listTableColumns('contains_binary', this.defaultSchema)
    const bksFields = columns.map(c => c.bksField)

    expect(bksFields).toStrictEqual([
      { name: ID, bksType: 'UNKNOWN' },
      { name: BIN, bksType: 'BINARY' },
    ])
  }

  private async createTables() {

    const primary = (table: Knex.CreateTableBuilder) => {
      if (this.dbType === 'firebird') {
        // FIXME can we do this from knex internally?
        table.specificType('id', 'integer generated by default as identity primary key')
      } else {
        table.increments().primary()
      }
    }

    await this.knex.schema.createTable('addresses', (table) => {
      primary(table)
      table.timestamps(true, true)
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
      table.timestamps(true, true)
      table.string("firstname")
      table.string("lastname")
      table.string("email").notNullable()
      table.integer("address_id").notNullable().unsigned()
      table.foreign("address_id").references("addresses.id")
    })

    await this.knex.schema.createTable("jobs", (table) => {
      primary(table)
      table.timestamps(true, true)
      table.string("job_name").notNullable()
      table.decimal("hourly_rate")
    })

    await this.knex.schema.createTable('has_index', (table) => {
      primary(table)
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
      table.timestamps(true, true)
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

    await this.knex.schema.createTable('organizations', (table) => {
      primary(table)
      table.string('organization_id', 255).notNullable();
      table.string('name', 255).notNullable();
      table.string('website', 255).nullable(); // Since 'NA', '-', and 'NULL' appear in the website field
      table.string('country', 255).notNullable();
      table.string('description').notNullable();
      table.integer('founded').notNullable();
      table.string('industry', 255).notNullable();
      table.integer('number_of_employees').notNullable();
    });

    await this.knex.schema.createTable('contains_binary', (table) => {
      table.integer("id").primary().notNullable()
      table.binary('bin', 8).nullable()
    })

    if (!this.data.disabledFeatures.generatedColumns && !this.options.skipGeneratedColumns) {
      const generatedDefs: Omit<Queries, 'redshift' | 'cassandra' | 'bigquery' | 'firebird' | 'clickhouse'> = {
        sqlite: "TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
        mysql: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        tidb: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        mariadb: "VARCHAR(255) AS (CONCAT(first_name, ' ', last_name)) STORED",
        sqlserver: "AS (first_name + ' ' + last_name) PERSISTED",
        oracle: `VARCHAR2(511) GENERATED ALWAYS AS ("first_name" || ' ' || "last_name")`,
        postgresql: "VARCHAR(511) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
        cockroachdb: "VARCHAR(511) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED",
        duckdb: "AS (first_name || ' ' || last_name)"
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
