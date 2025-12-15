import rawLog from "@bksLogger"
import { IDbConnectionDatabase } from "@/lib/db/types"
import {
  Trino as TrinoNodeClient,
  BasicAuth,
  QueryResult,
  ConnectionOptions as TrinoConnectionOptions
} from 'trino-client'
import {
  BaseQueryResult,
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions
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
import { errors } from "@/lib/errors"
import { IDbConnectionServer } from "@/lib/db/backendTypes"
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase"

interface ResultColumn {
  name: string
  type: string
}

interface TrinoResult extends BaseQueryResult {
  info?: any,
  length?: number,
  queryId?: string
}

const log = rawLog.scope("trino")
const knex = null
const trinoContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null
  }
}

export class TrinoClient extends BasicDatabaseClient<TrinoResult> {
  version: string
  client: any
  supportsTransaction: boolean

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, trinoContext, server, database)
    this.dialect = "generic"
    this.readOnlyMode = server?.config?.readOnlyMode || false
  }

  rowsToObject(columns: ResultColumn[] = [], rows: any[][]= [[]]) {
    const keys = columns.map(col => col?.name).filter(c => c != null)
    return rows.map(row => _.zipObject(keys, row))
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
    // Trino client doesn't have a close method, just clean up the reference
    this.client = null
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
  ): Promise<TableResult> {
    const columns = await this.listTableColumns(table, schema)
    let selectFields = [...selects]
    if (!selects || selects?.length === 0 || (selects?.length === 1 && selects[0] === '*')) {
      // select all columns with the column names instead of *
      selectFields = columns.map((v) => v.columnName)
    }

    const queries = this.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selectFields,
      schema
    )

    const { query } = queries
    const result = await this.driverExecuteSingle(query)
    const fields = result.columns ? result.columns.map(c => ({
      name: c.name,
      bksType: 'UNKNOWN' as BksFieldType
    })) : []
    return {
      result: result.rows || [],
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
    selects: string[]
  ): Promise<string> {
    const columns = await this.listTableColumns(table, schema)
    const { query } = this.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects,
      schema
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

  async getOutgoingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return []
  }

  async getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return []
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
    const sql = `show schemas from ${this.db}`
    const result = await this.driverExecuteSingle(sql)

    return result?.rows ? result.rows.map((row) => row.Schema) : []
  }

   async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    log.info('filters in listTables', filter)
    if (!filter) return []
    const sql = `select * from ${this.db}.information_schema.tables`
    const result = await this.driverExecuteSingle(sql)

    return result.rows.map((row) => ({
      schema: row['table_schema'],
      name: row['table_name'],
      entityType: 'table' as const
    }))
  }

  async listTableColumns(table: string, schema: string): Promise<ExtendedTableColumn[]> {
    const sql = `
      SELECT
        *
      FROM ${this.db}.information_schema.columns
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
    log.debug("Trino doesn't support creating databases")
    return null
  }

  async truncateElementSql() {
    log.debug("Trino doesn't support changing data")
    return null
  }

  async duplicateTable(): Promise<void> {
    log.debug("Trino doesn't support changing data")
    return null
  }

  async duplicateTableSql(): Promise<string> {
    log.debug("Trino doesn't support changing data")
    return null
  }

  async setElementNameSql(): Promise<string> {
    log.debug("Trino doesn't support changing data")
    return null
  }

  async getBuilder(_table: string, _schema?: string): Promise<ChangeBuilderBase> {
    log.debug("Trino doesn't support changing data")
    return null
  }

  async query(queryText: string): Promise<CancelableQuery> {
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER)
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText),
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
       // TODO: How to cancel - would need to switch to a client.execute vs client.query and have a mechanism to connect the running query to the queryId returned during the lifecycle of the query
      },
    }
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
    const queries = queryText.trim().split(';')
    const results: NgQueryResult[] = await Promise.all(
      queries
        .filter(q => q.trim() !== '')
        .map(async q => {
          const {rows, columns} = await this.driverExecuteSingle(q)
          const fields = rows.length === 0 ? [] : columns.map(c => ({ ...c, id: c.name }))
          return {
            fields,
            rows,
            rowCount: rows.length,
            affectedRows: 0,
            command: 'SELECT'
          } satisfies NgQueryResult
        })
    )
    return results
  }

  async rawExecuteQuery(sql: string): Promise<TrinoResult> {
    try {
      // The trino query parser doesn't particularly like semicolons. Who can blame it?
      const result: AsyncIterableIterator<QueryResult> = await this.client.query(sql.trim().replace(/;$/, ''))
      
      let columns: ResultColumn[] = []
      const rows: any[] = []
      
      for await (const r of result) {
        const { data: resultData, columns: resultColumns } = r
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
      throw err
    }
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
      transactions: this.supportsTransaction,
      filterTypes: ['standard']
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
    log.debug("Trino doesn't support creating tables")
    return ''
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    log.debug("Trino doesn't support view creatinon")
    return []
  }

  async getRoutineCreateScript(): Promise<string[]> {
    return []
  }

  async setTableDescription(): Promise<string> {
    log.debug("Trino doesn't support changing data")
    return ''
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    log.debug("Trino doesn't support changing data")
  }

  async getTableLength(table: string, schema: string): Promise<number> {
    const result = await this.driverExecuteSingle(
      `SELECT count(*) as count FROM ${this.wrapIdentifier(this.db)}.${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}`
    )

    const [row] = result.rows as { count: number }[]
    return row.count
  }

  // No exports of stuff since I don't think tables will be exported. Result sets, sure. Not tables
  async selectTopStream(): Promise<StreamResults> {
    return {
      columns: [],
      totalRows: 0,
      cursor: null
    }
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.")
  }

  wrapIdentifier(value: string): string {
    return TrinoData.wrapIdentifier(value)
  }

  wrapDynamicLiteral(value: any): string {
    if (value == null) return 'NULL'
    if (typeof value === 'number' || /^[+-]?([0-9]*[.])?[0-9]+$/.test(value)) {
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE'
    }
    return `'${value.toString().replace(/'/g, "''")}'`
  }


  buildFilterString(filters: TableFilter[], columns = []) {
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

  buildSelectTopQuery(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    countTitle = "total",
    columns = [],
    selects = ["*"],
    schema
  ) {
    log.info("building selectTop for", table, offset, limit, orderBy, selects, schema)

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
      const filterBlob = this.buildFilterString(filters, columns)
      filterString = filterBlob.fullFilterString
      fullFilterString = filterBlob.fullFilterString
    }

    const wrappedSelects = selectsArr.map((s) => s === '*' ? s : TrinoData.wrapIdentifier(s)).join(", ")
    const wrappedTable = `${TrinoData.wrapIdentifier(schema)}.${TrinoData.wrapIdentifier(table)}`

    // Count query remains simple
    const countSQL = `
      SELECT COUNT(*) AS ${countTitle}
      FROM ${wrappedTable}
      ${filterString}
    `

    const paginatedSQL = this.buildPaginatedQuery(wrappedTable, filterString, wrappedSelects, rowNumberOrderClause, usePagination, safeOffset, safeLimit)
    const fullSql = this.buildPaginatedQuery(TrinoData.wrapIdentifier(table), fullFilterString, wrappedSelects, rowNumberOrderClause, usePagination, safeOffset, safeLimit)
    
    return {
      query: paginatedSQL,
      fullQuery: fullSql,
      countQuery: countSQL,
      params: {},
    }
  }

  buildPaginatedQuery(tableRef: string, filter: string, wrappedSelects: string, rowNumberOrderClause: string, usePagination: boolean, safeOffset: number, safeLimit: number): string {
    return `
      WITH ranked AS (
        SELECT 
          ${wrappedSelects},
          ROW_NUMBER() OVER (${rowNumberOrderClause}) AS rownum
        FROM ${this.db}.${tableRef}
        ${filter}
      )
      SELECT *
      FROM ranked
      ${usePagination ? `WHERE rownum > ${safeOffset} AND rownum <= ${safeOffset + safeLimit}` : ""}
    `
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
