import rawLog from "@bksLogger"
import { IDbConnectionDatabase } from "@/lib/db/types"
import {
  Trino as TrinoNodeClient,
  BasicAuth,
  QueryResult,
  ConnectionOptions as TrinoConnectionOptions
} from 'trino-client'
import { identify } from "sql-query-identifier"
import {
  BaseQueryResult,
  BasicDatabaseClient
} from "@/lib/db/clients/BasicDatabaseClient"
import {
  BksField,
  BksFieldType,
  CancelableQuery,
  DatabaseFilterOptions,
  ExtendedTableColumn,
  FilterOptions,
  NgQueryResult,
  OrderBy,
  PrimaryKeyColumn,
  Routine,
  SchemaFilterOptions,
  StreamResults,
  SupportedFeatures,
  TableChanges,
  TableColumn,
  TableFilter,
  TableIndex,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger
} from "@/lib/db/models"
import { TrinoData } from "@shared/lib/dialects/trino"
import _ from "lodash"
import {
  createCancelablePromise,
  joinFilters
} from "@/common/utils"
import {
  AlterTableSpec,
  TableKey
} from "@shared/lib/dialects/models"
import { IdentifyResult } from "sql-query-identifier/lib/defines"
import { uuidv4 } from "@/lib/uuid"
import { errors } from "@/lib/errors"
import { IDbConnectionServer } from "@/lib/db/backendTypes"
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase"

interface ResultColumn {
  name: string
  type: string
}

interface TrinoResult extends BaseQueryResult {
  queryId?: string
}

type Result = TrinoResult

const log = rawLog.scope("trino")
const knex = null

export class TrinoClient extends BasicDatabaseClient<Result> {
  version: string
  client: any
  supportsTransaction: boolean

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, null, server, database)
    this.dialect = "generic"
    this.readOnlyMode = server?.config?.readOnlyMode || false
  }

  rowsToObject(columns: ResultColumn[] = [], rows: any[][]= [[]]) {
    const keys = columns.map(col => col?.name).filter(c => c != null)
    return rows.map(row => _.zipObject(keys, row))
  }

  async driverExecuteSingle(sql): Promise<Result> {
    try {
      const result: AsyncIterableIterator<QueryResult> = await this.client.query(sql)
      
      let columns: ResultColumn[] = []
      const rows: any[] = []
      
      for await (const r of result) {
        const { data: resultData, columns: resultColumns } = r
        // log.info('!!driverExecuteSingle RESULT!!', r)
        columns = resultColumns
  
        if (resultData) rows.push(...resultData)
      }

      if (rows.length === 0) {
        return {
          columns,
          rows: [],
          arrayMode: false,
          queryId: ''
        }
      }
  
      return {
        columns,
        rows: this.rowsToObject(columns, rows),
        arrayMode: false
      }
    } catch (err) {
      log.error(err)
    }
  }

  async connect(): Promise<void> {
    await super.connect()

    let url: string
    let connectionObj = {} as TrinoConnectionOptions

    if (this.server.config.url) {
      url = this.server.config.url
    } else {
      const urlObj = new URL('http://example.com/')
      urlObj.hostname = this.server.config.host
      urlObj.port = this.server.config.port.toString()
      urlObj.protocol = this.server.config.ssl ? 'https:' : 'http:'
      url = urlObj.toString()
    }

    connectionObj = {
      server: url,
      catalog: this.database.database
    }
    
    // TODO: Add ssl using SecureContextOptions (https://trinodb.github.io/trino-js-client/types/ConnectionOptions.html)
    
    if ((this.server.config.user != null && this.server.config.user !== '') || (this.server.config.password != null && this.server.config.password !== '')) {
      connectionObj.auth = new BasicAuth(this.server.config.user, this.server.config.password)
    }

    this.client = TrinoNodeClient.create(connectionObj)
    const result = await this.driverExecuteSingle(
      "SELECT version()"
    )

    this.version = result.rows[0]['_col0']
    this.supportsTransaction = false
  }

  async disconnect(): Promise<void> {
    await this.client.close()
    await super.disconnect()
  }

  async versionString(): Promise<string> {
    return this.version
  }

  async alterTable(_change: AlterTableSpec): Promise<void> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async getPrimaryKeys(): Promise<PrimaryKeyColumn[]> {
    log.info("Trino doesn't support primary keys")
    return await []
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string | null> {
    log.info("Trino doesn't support primary keys")
    return null
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema: string,
    selects: string[],
    database: string
  ): Promise<TableResult> {
    const columns = await this.listTableColumns(table, schema, database)
    let selectFields = [...selects]
    if (!selects || selects?.length === 0 || (selects?.length === 1 && selects[0] === '*')) {
      // select all columns with the column names instead of *
      selectFields = columns.map((v) => v.columnName)
    }
    
    const queries = TrinoClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selectFields,
      schema,
      database
    )

    const { query } = queries
    const result = await this.driverExecuteSingle(query)
    const fields = result.columns.map(c => ({
      name: c.name,
      bksType: 'UNKNOWN' as BksFieldType
    }))
    return {
      result: result.rows,
      fields
    }
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema: string,
    selects: string[],
    database: string
  ): Promise<string> {
    const columns = await this.listTableColumns(table, schema, database)
    const { query } = TrinoClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects,
      schema,
      database
    )
    return query
  }

  async getTableProperties(
    _table: string,
    _schema?: string
  ): Promise<TableProperties> {
    log.info("Trino doesn't support table properties for all databases")
    return null
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return await []
  }

  async listTableTriggers(
    _table: string,
    _schema?: string
  ): Promise<TableTrigger[]> {
    // Not supported
    return []
  }

  async listTableIndexes(
    _table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    log.info("Trino doesn't support table indexes in all databases it supports")
    return null
  }

  async listViews(
    _filter: FilterOptions = { schema: "public" }
  ): Promise<TableOrView[]> {
    log.info("Trino doesn't support views")
    return []
  }

  async executeApplyChanges(_changes: TableChanges): Promise<any[]> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async dropElement(): Promise<void> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = "show catalogs"
    const result = await this.driverExecuteSingle(sql)

    return result.rows.map((row) => row.Catalog)
  }

  async listSchemas(filter: SchemaFilterOptions): Promise<string[]> {
    log.info('filters in listSchemas', filter)
    if (filter.database == null) return []
    const sql = `show schemas from ${filter.database}`
    const result = await this.driverExecuteSingle(sql)

    return result.rows.map((row) => row.Schema)
  }

   async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    log.info('filters in listTables', filter)
    if (filter.database == null || filter.database == null) return []
    const sql = `select * from ${filter.database}.information_schema.tables`
    const result = await this.driverExecuteSingle(sql)

    return result.rows.map((row) => ({
      schema: row['table_schema'],
      name: row['table_name'],
      entityType: 'table' as const
    }))
  }

  async listTableColumns(table: string, schema: string, catalog: string): Promise<ExtendedTableColumn[]> {
    const sql = `
      SELECT
        *
      FROM ${catalog}.information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${table}'
      ORDER BY ordinal_position
    `
    const result = await this.driverExecuteSingle(sql)
    return result.rows.map((row) => {
      // Empty string if it is not defined.
      const hasDefault = row.column_default != null

      return {
        schemaName: row.table_schema,
        tableName: row.table_name,
        columnName: row.column_name,
        dataType: row.data_type,
        ordinalPosition: row.ordinal_position,
        defaultValue: row.column_default,
        hasDefault,
        comment: row.comment,
        primaryKey: false,
        nullable: row.is_nullable,
        bksField: this.parseTableColumn(row),
      }
    })
  }

  async createDatabase(): Promise<string> {
    log.info("Trino doesn't support creating databases")
    return null
  }

  async truncateElementSql() {
    log.info("Trino doesn't support changing data")
    return null
  }

  async duplicateTable(): Promise<void> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async duplicateTableSql(): Promise<string> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async setElementNameSql(): Promise<string> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async getBuilder(_table: string, _schema?: string): Promise<ChangeBuilderBase> {
    log.info("Trino doesn't support changing data")
    return null
  }

  async query(queryText: string): Promise<CancelableQuery> {
    let queryId = uuidv4()
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER)
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText, { queryId }),
          ])
          if (!data) return []
          return data
        } catch (err) {
          if (cancelable.canceled) {
            err.sqlectronError = "CANCELED_BY_USER"
          }
          throw err
        } finally {
          cancelable.discard()
        }
      },
      cancel: async (): Promise<void> => {
        await this.driverExecuteSingle(
          `KILL QUERY WHERE query_id='${queryId}'`
        )
        cancelable.cancel()
      },
    }
  }

  async driverExecuteMultiple(queryText: string): Promise<BaseQueryResult[]> {
    let identification
    try {
      identification = identify(queryText, { strict: false, dialect: 'generic', identifyTables: false })
    } catch (ex) {
      log.error("Unable to identify query", ex)
    }

    const results = await Promise.all(
      identification.map(async query => {
        let queryText = query.text.trim()

        if (queryText.endsWith(';')) {
          queryText = queryText.slice(0, -1)
        }

        try {
          const queryResult = await this.driverExecuteSingle(queryText) 
          
          return queryResult
        } catch (err) {
          throw new Error(err)
        }
      })
    )
    return results
  }

  parseFields(fields: any[]) {
    return fields.map(column => ({
      dataType: column.type,
      id: column.name,
      name: column.name
    }))
  }

  async executeQuery(
    queryText: string
  ): Promise<NgQueryResult[]> {
    const results = await this.driverExecuteMultiple(queryText)
    const ret = []
    for (const result of results) {
      const fields = this.parseFields(result.columns)
      const data = result.rows
      // const data =
      //   result.resultType === "stream"
      //     ? await streamToString(result.data)
      //     : result.data

      const isEmptyResult = !data

      if (isEmptyResult) {
        ret.push({
          fields: [],
          affectedRows: 0, // Trino doesn't do write operations. No need to have anything other than 0 here
          command: 'SELECT',
          rows: [],
          rowCount: 0,
          queryId: ''
        })
        continue
      }

      // if (_.isString(data)) {
      //   ret.push({
      //     fields: result.columns,
      //     affectedRows: 0, // TODO (azmi): implement affectedRows
      //     command: 'select',
      //     rows: data,
      //     rowCount: data.length,
      //   })
      //   continue
      // }

      ret.push({
        fields,
        affectedRows: 0, // Trino doesn't typically (well you just shouldn't because you have actual databases for that) do write operations. No need to have anything other than 0 here
        command: 'select',
        rows: data,
        rowCount: data.length,
        queryId: ''
      })
    }
    return ret
  }

  async rawExecuteQuery(_query: string): Promise<Result[]> {
    // TODO: Still need this?
    log.info("Trino doesn't support changing data")
    return null
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: false,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: this.supportsTransaction
    }
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    log.info("Trino doesn't support reoutines")
    return []
  }

  async listMaterializedViewColumns(): Promise<TableColumn[]> {
    log.info("Trino doesn't support materialized views")
    return []
  }

  async getTableReferences(
    _table: string,
    _schema?: string
  ): Promise<string[]> {
    log.info("Trino doesn't support foreign keys")
    return []
  }

  async getQuerySelectTop(
    table: string,
    limit: number,
    _schema?: string
  ): Promise<string> {
    return `SELECT * FROM ${TrinoData.wrapIdentifier(
      table
    )} LIMIT ${limit}`
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    log.info("Trino doesn't support materialized views")
    return []
  }

  async listCharsets(): Promise<string[]> {
    return []
  }

  async getDefaultCharset(): Promise<string> {
    return ""
  }

  async listCollations(_charset: string): Promise<string[]> {
    return []
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.")
  }

  async getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    log.info("Trino doesn't support creating tables")
    return ''
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    log.info("Trino doesn't support view creatinon")
    return []
  }

  async getRoutineCreateScript(): Promise<string[]> {
    return []
  }

  async setTableDescription(): Promise<string> {
    log.info("Trino doesn't support changing data")
    return ''
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    log.info("Trino doesn't support changing data")
  }

  async getTableLength(table: string, schema: string, database: string): Promise<number> {
    const result = await this.driverExecuteSingle(
      `SELECT count(*) as count FROM ${this.wrapIdentifier(database)}.${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}`
    )

    const [row] = result.rows as { count: number }[]
    return row.count
  }

  // TODO: ALL THE STREAMING!
  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _chunkSize: number,
    schema: string,
    database: string
  ): Promise<StreamResults> {
    const qs = TrinoClient.buildSelectTopQuery(
      table,
      null,
      null,
      orderBy,
      filters,
      "total",
      null,
      null,
      schema,
      database
    )
    // in a way, it kind of already does streaming because it returns data one row at a time that you then create your return from
    // 
    const result = await this.driverExecuteSingle(qs.countQuery)
    const json = result.data as ResponseJSON<{ total: number }>
    const totalRows = Number(json.data[0].total) || 0
    const columns = await this.listTableColumns(table, schema, database)
    return { totalRows, columns, cursor }
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.")
  }

  wrapIdentifier(value: string): string {
    return TrinoData.wrapIdentifier(value)
  }

  static wrapDynamicLiteral(value: any): string {
    if (value == null) return 'NULL'
    if (typeof value === 'number' || /^[+-]?([0-9]*[.])?[0-9]+$/.test(value)) {
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    }
    return `'${value.toString().replace(/'/g, "''")}'`
  }


  static buildFilterString(filters: TableFilter[], columns = []) {
    let fullFilterString = ""

    if (filters && Array.isArray(filters) && filters.length > 0) {
      const filtersWithoutParams: string[] = []

      filters.forEach((item) => {
        const column = columns.find((c) => c.columnName === item.field)
        const field = column?.dataType?.toUpperCase().includes("BINARY")
          ? `HEX(${TrinoData.wrapIdentifier(item.field)})`
          : TrinoData.wrapIdentifier(item.field)

        const op = item.type.toUpperCase()
        const val = item.value

        // Handle IS NULL / IS NOT NULL
        if (op === "IS NULL" || op === "IS NOT NULL") {
          filtersWithoutParams.push(`${field} ${op}`)
          return
        }

        // Handle IN
        if (op === "IN" && Array.isArray(val)) {
          const values = val
            .map((v) => this.wrapDynamicLiteral(v))
            .join(", ")
          filtersWithoutParams.push(`${field} IN (${values})`)
          return
        }

        // Handle binary ops (>, <, >=, <=, =, !=, LIKE, ILIKE)
        if (
          ["=", "!=", "<", "<=", ">", ">=", "LIKE", "ILIKE"].includes(op) &&
          val != null
        ) {
          const literal = this.wrapDynamicLiteral(val)
          filtersWithoutParams.push(`${field} ${op} ${literal}`)
          return
        }
      })

      fullFilterString = "WHERE " + joinFilters(filtersWithoutParams, filters)
    }

    return {
      fullFilterString,
    }
  }

  static buildSelectTopQuery(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    countTitle = "total",
    columns = [],
    selects = ["*"],
    schema,
    database
  ) {
    log.info("building selectTop for", table, offset, limit, orderBy, selects, schema, database)

    // Ensure sane defaults
    const safeOffset = Number.isFinite(offset) ? offset : 0
    const safeLimit = Number.isFinite(limit) ? limit : 100
    const usePagination = Number.isFinite(limit)
    const selectsArr = !Array.isArray(selects) || selects.length === 0 ? ['*'] : selects

    let rowNumberOrderClause = ""

    if (orderBy && orderBy.length > 0) {
      const orderByParts = orderBy.map((item: any) => {
        if (_.isObject(item)) {
          return `${TrinoData.wrapIdentifier(item["field"])} ${item["dir"].toUpperCase()}`
        } else {
          return TrinoData.wrapIdentifier(item)
        }
      })

      rowNumberOrderClause = "ORDER BY " + orderByParts.join(", ")
    } else {
      rowNumberOrderClause = "ORDER BY 1" // Fallback for ROW_NUMBER
    }

    let filterString = ""
    let fullFilterString = ""
    if (_.isString(filters)) {
      filterString = fullFilterString = `WHERE ${filters}`
    } else {
      const filterBlob = TrinoClient.buildFilterString(filters, columns)
      filterString = filterBlob.fullFilterString
      fullFilterString = filterBlob.fullFilterString
    }

    const wrappedSelects = selectsArr.map((s) => s === '*' ? s : TrinoData.wrapIdentifier(s)).join(", ")
    const wrappedTable = `${TrinoData.wrapIdentifier(database)}.${TrinoData.wrapIdentifier(schema)}.${TrinoData.wrapIdentifier(table)}`

    // Count query remains simple
    const countSQL = `
      SELECT COUNT(*) AS ${countTitle}
      FROM ${wrappedTable}
      ${filterString}
    `

    // Helper to build a query with optional pagination WHERE clause
    const buildPaginatedQuery = (tableRef: string, filter: string) => `
      WITH ranked AS (
        SELECT 
          ${wrappedSelects},
          ROW_NUMBER() OVER (${rowNumberOrderClause}) AS rownum
        FROM ${tableRef}
        ${filter}
      )
      SELECT *
      FROM ranked
      ${usePagination ? `WHERE rownum > ${safeOffset} AND rownum <= ${safeOffset + safeLimit}` : ""}
    `
    const paginatedSQL = buildPaginatedQuery(wrappedTable, filterString)
    const fullSql = buildPaginatedQuery(TrinoData.wrapIdentifier(table), fullFilterString)
    
    log.info('!!sql!!', paginatedSQL)
    return {
      query: paginatedSQL,
      fullQuery: fullSql,
      countQuery: countSQL,
      params: {},
    }
  }

  protected violatesReadOnly(statements: IdentifyResult[], options: any = {}) {
    return (
      super.violatesReadOnly(statements, options) ||
      (this.readOnlyMode && options.insert)
    )
  }

  parseTableColumn(column: TableColumn): BksField {
    return { name: column.columnName, bksType: "UNKNOWN" }
  }
}
