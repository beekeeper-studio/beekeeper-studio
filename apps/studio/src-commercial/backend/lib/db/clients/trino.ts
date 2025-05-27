import rawLog from "@bksLogger";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import {
  Trino as TrinoNodeClient,
  BasicAuth,
  QueryResult,
  ConnectionOptions as TrinoConnectionOptions,
  // QueryData
} from 'trino-client'
import {
  BaseQueryResult,
  BasicDatabaseClient,
  // ExecutionContext,
  // QueryLogOptions,
} from "@/lib/db/clients/BasicDatabaseClient";
// import { ClickhouseKnexClient } from "@shared/lib/knex-clickhouse";
// import knexlib from "knex";
import {
  BksField,
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
  TableDelete,
  TableFilter,
  TableIndex,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger,
  TableUpdate,
  TableUpdateResult,
} from "@/lib/db/models";
import { TrinoData } from "@shared/lib/dialects/trino";
import _ from "lodash";
import {
  createCancelablePromise,
  joinFilters,
  streamToString,
} from "@/common/utils";
import {
  AlterTableSpec,
  IndexColumn,
  TableKey,
} from "@shared/lib/dialects/models";
// import { Stream } from "stream";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { uuidv4 } from "@/lib/uuid";
import { errors } from "@/lib/errors";
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
// import { ClickHouseCursor } from "./clickhouse/ClickHouseCursor";

// interface JSONResult {
//   statement: IdentifyResult;
//   data: QueryResult;
//   resultType: "json";
// }

// interface StreamResult {
//   statement: IdentifyResult;
//   data: Stream;
//   resultType: "stream";
// }

// type JSONOrStreamResult = JSONResult | StreamResult;

interface ResultColumn {
  name: string;
  type: string
}

/*
columns: { name: string }[]
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
*/
// interface BaseResult {
//   rows: any[];
//   columns: ResultColumn[]
//   arrayMode: boolean
// }

type Result = BaseQueryResult;
// type Result = BaseResult & JSONOrStreamResult;

interface ExecuteQueryOptions {
  params?: Record<string, any>;
  queryId?: string;
}

// interface RawExecuteQueryOptions extends ExecuteQueryOptions {
//   statements: IdentifyResult[];
//   /** Run using insert method */
//   insert?: InsertParams;
//   arrayMode?: boolean;
// }

const log = rawLog.scope("clickhouse");

// const clickhouseContext = {
//   getExecutionContext(): ExecutionContext {
//     return null;
//   },
//   logQuery(
//     _query: string,
//     _options: QueryLogOptions,
//     _context: ExecutionContext
//   ): Promise<number | string> {
//     return null;
//   },
// };

// const knex = knexlib({ client: ClickhouseKnexClient });
const knex = null

const RE_NULLABLE = /^Nullable\((.*)\)$/;
const RE_SELECT_FORMAT = /^\s*SELECT.+FORMAT\s+(\w+)\s*;?$/i;

export class TrinoClient extends BasicDatabaseClient<Result> {
  version: string;
  client: any;
  supportsTransaction: boolean;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, null, server, database);
    this.dialect = "generic";
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  rowsToObject(columns: ResultColumn[], rows: any[][]) {
    const keys = columns.map(col => col.name)
    return rows.map(row => _.zipObject(keys, row))
  }

  async driverExecuteSingle(sql): Promise<Result> {
    const result: AsyncIterableIterator<QueryResult> = await this.client.query(sql)

    let columns: ResultColumn[] = []
    let rows: any[] = []

    for await (const r of result) {
      columns = r.columns

      console.log('r.data: ', r.data)
      if (r.data) rows.push(...r.data)
    }

    if (rows.length === 0) {
      return {
        columns,
        rows,
        arrayMode: false
      }
    }

    return {
      columns,
      rows: this.rowsToObject(columns, rows),
      arrayMode: false
    }

    
  }

  async connect(): Promise<void> {
    await super.connect();

    let url: string;
    let connectionObj = {} as TrinoConnectionOptions

    if (this.server.config.url) {
      url = this.server.config.url
    } else {
      const urlObj = new URL('http://example.com/');
      urlObj.hostname = this.server.config.host;
      urlObj.port = this.server.config.port.toString();
      urlObj.protocol = this.server.config.ssl ? 'https:' : 'http:';
      url = urlObj.toString();
    }

    connectionObj = {
      server: url,
      catalog: this.database.database
    }
    
    // TODO: Add ssl using SecureContextOptions (https://trinodb.github.io/trino-js-client/types/ConnectionOptions.html)
    
    if ((this.server.config.user != null && this.server.config.user !== '') || (this.server.config.password != null && this.server.config.password !== '')) {
      connectionObj.auth = new BasicAuth(this.server.config.user, this.server.config.password)
    }

    this.client = TrinoNodeClient.create(connectionObj);
    const result = await this.driverExecuteSingle(
      "SELECT version()"
    );

    this.version = result.rows[0]['_col0']
    this.supportsTransaction = await this.checkTransactionSupport();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    await super.disconnect();
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async alterTable(_change: AlterTableSpec): Promise<void> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async getPrimaryKeys(): Promise<PrimaryKeyColumn[]> {
    log.error("Trino doesn't support primary keys")
    return null
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string | null> {
    log.error("Trino doesn't support primary keys")
    return null
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<TableResult> {
    const columns = await this.listTableColumns(table);
    if (!selects || (selects?.length === 1 && selects[0] === '*')) {
      // select all columns with the column names instead of *
      selects = columns.map((v) => v.bksField.name);
    }
    const queries = ClickHouseClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects
    );
    const { fullQuery } = queries;
    const result = await this.driverExecuteSingle(fullQuery);
    const fields = this.parseQueryResultColumns(result);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<string> {
    const columns = await this.listTableColumns(table);
    const { fullQuery } = ClickHouseClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects
    );
    return fullQuery;
  }

  async getTableProperties(
    _table: string,
    _schema?: string
  ): Promise<TableProperties> {
    log.error("Trino doesn't support table properties for all databases")
    return null
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    // Clickhouse does not support foreign keys.
    return [];
  }

  async listTableTriggers(
    _table: string,
    _schema?: string
  ): Promise<TableTrigger[]> {
    // Not supported
    return [];
  }

  async listTableIndexes(
    _table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    log.error("Trino doesn't support table indexes in all databases it supports")
    return null
  }

  async listViews(
    _filter: FilterOptions = { schema: "public" }
  ): Promise<TableOrView[]> {
    log.error("Trino doesn't support views")
    return null
  }

  async executeApplyChanges(_changes: TableChanges): Promise<any[]> {
    log.error("Trino doesn't support changing data")
    return null
  }

  private async runWithTransaction(fn: () => Promise<any>) {
    const supportsTransactions = (await this.supportedFeatures()).transactions;
    try {
      await fn();
      if (supportsTransactions) {
        await this.driverExecuteSingle("COMMIT");
      }
    } catch (e) {
      log.error(e);
      if (supportsTransactions) {
        await this.driverExecuteSingle("ROLLBACK");
      }
      throw e;
    }
  }

  /**
   * ClickHouse has experimental support for transactions, commits, and
   * rollback functionality. You'll need to enable it by adding the settings
   * to the ClickHouse config.
   *
   * See: https://clickhouse.com/docs/en/guides/developer/transactional#transactions-commit-and-rollback
   **/
  private async checkTransactionSupport(): Promise<boolean> {
    return false
  }

  async dropElement(): Promise<void> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = "show catalogs";
    const result = await this.driverExecuteSingle(sql);

    return result.rows.map((row) => row.Catalog);
  }

  async listSchemas(_filter: SchemaFilterOptions): Promise<string[]> {
    // this is where we'll need to get which database is coming through so we can get the command
    // show schemas from <database>
    // Trino doesn't support schemas
    return [];
  }

   async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    // const sql = `show tables from ${filter.database}.${filter.schema}`;
    // const result: Result = await this.driverExecuteSingle(sql);
    // console.log('list tables: ', result)
    
    return []
    // return result.rows.map((row) => ({
    //   name: row.name,
    //   tabletype: "table",
    //   engine: row.engine,
    // }));
  }

  async listTableColumns(
    table?: string,
    _schema?: string
  ): Promise<ExtendedTableColumn[]> {
    const sql = `
      SELECT
        name,
        table,
        type,
        is_in_primary_key,
        position,
        comment,
        default_expression,
      FROM system.columns
      WHERE database = currentDatabase()
        ${table ? "AND table = {table: String}" : ""}
      ORDER BY position
    `;
    const result = await this.driverExecuteSingle(sql, {
      params: { table },
    });
    const json = result.data as ResponseJSON<{
      name: string;
      table: string;
      type: string;
      is_in_primary_key: number;
      position: number;
      comment: string;
      default_expression: string;
    }>;
    return json.data.map((row) => {
      // Empty string if it is not defined.
      const hasDefault = row.default_expression !== "";
      return {
        tableName: row.table,
        columnName: row.name,
        dataType: row.type,
        ordinalPosition: row.position,
        defaultValue: hasDefault ? row.default_expression : null,
        hasDefault,
        comment: row.comment,
        primaryKey: row.is_in_primary_key === 1,
        nullable: RE_NULLABLE.test(row.type),
        bksField: this.parseTableColumn(row),
      };
    });
  }

  async createDatabase(): Promise<string> {
    log.error("Trino doesn't support creating databases")
    return null
  }

  async truncateElementSql() {
    log.error("Trino doesn't support changing data")
    return null
  }

  async duplicateTable(): Promise<void> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async duplicateTableSql(): Promise<string> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async setElementNameSql(): Promise<string> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async getBuilder(_table: string, _schema?: string): Promise<ChangeBuilderBase> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async query(queryText: string): Promise<CancelableQuery> {
    let queryId = uuidv4();
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText, { queryId }),
          ]);
          if (!data) return [];
          return data;
        } catch (err) {
          if (cancelable.canceled) {
            err.sqlectronError = "CANCELED_BY_USER";
          }
          throw err;
        } finally {
          cancelable.discard();
        }
      },
      cancel: async (): Promise<void> => {
        // FIXME (azmi): If you are killing a query in ClickHouse Cloud or in
        // a self-managed cluster, then be sure to use the ON CLUSTER
        // [cluster-name] option, in order to ensure the query is killed on
        // all replicas:::
        // See https://clickhouse.com/docs/en/sql-reference/statements/kill
        await this.driverExecuteSingle(
          `KILL QUERY WHERE query_id='${queryId}'`
        );
        cancelable.cancel();
      },
    };
  }

  async executeQuery(
    queryText: string,
    options?: ExecuteQueryOptions
  ): Promise<NgQueryResult[]> {
    // FIXME we should check if the result is in JSON or buffer. If not both,
    // just cast it to a string.
    const results = await this.driverExecuteMultiple(queryText, {
      ...options,
      arrayMode: true,
    });
    const ret = [];
    for (const result of results) {
      const data =
        result.resultType === "stream"
          ? await streamToString(result.data)
          : result.data;

      const isEmptyResult = !data;

      if (isEmptyResult) {
        ret.push({
          fields: [],
          affectedRows: 0, // TODO (azmi): implement affectedRows
          command: result.statement.type,
          rows: [],
          rowCount: 0,
        });
        continue;
      }

      if (_.isString(data)) {
        ret.push({
          fields: [{ id: "c0", name: "Result" }],
          affectedRows: 0, // TODO (azmi): implement affectedRows
          command: result.statement.type,
          rows: [{ c0: data }],
          rowCount: 1,
        });
        continue;
      }

      const fields = data.meta.map((field, idx) => ({
        id: `c${idx}`,
        name: field.name,
        dataType: field.type,
      }));

      const rows = data.data.map((row) =>
        row.reduce((acc, val, idx) => ({ ...acc, [`c${idx}`]: val }), {})
      );

      ret.push({
        fields,
        affectedRows: 0, // TODO we can get this somewhere i feel like??
        command: result.statement.type,
        rows,
        rowCount: rows.length,
      });
    }
    return ret;
  }

  async rawExecuteQuery(_query: string): Promise<Result[]> {
    // TODO: Still need this?
    log.error("Trino doesn't support changing data")
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
    };
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    // Clickhouse doesn't support routines
    return [];
  }

  async listMaterializedViewColumns(): Promise<TableColumn[]> {
    log.error("Trino doesn't support materialized views")
    return null
  }

  async getTableReferences(
    _table: string,
    _schema?: string
  ): Promise<string[]> {
    // Trino does not support foreign keys.
    return [];
  }

  async getQuerySelectTop(
    table: string,
    limit: number,
    _schema?: string
  ): Promise<string> {
    return `SELECT * FROM ${TrinoData.wrapIdentifier(
      table
    )} LIMIT ${limit}`;
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    log.error("Trino doesn't support materialized views")
    return []
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return "";
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    log.error("Trino doesn't support creating tables")
    return null
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    log.error("Trino doesn't support view creatinon")
    return null
  }

  async getRoutineCreateScript(): Promise<string[]> {
    return [];
  }

  async setTableDescription(): Promise<string> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    log.error("Trino doesn't support changing data")
    return null
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const result = await this.driverExecuteSingle(
      `SELECT count() as count FROM {table: Identifier}`,
      { params: { table } }
    );
    const json = result.data as ResponseJSON<{ count: number }>;
    return json.data[0].count;
  }

  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number,
    schema?: string
  ): Promise<StreamResults> {
    const qs = ClickHouseClient.buildSelectTopQuery(
      table,
      null,
      null,
      orderBy,
      filters,
      schema
    );
    const result = await this.driverExecuteSingle(qs.countQuery, {
      params: qs.params,
    });
    const json = result.data as ResponseJSON<{ total: number }>;
    const totalRows = Number(json.data[0].total) || 0;
    const columns = await this.listTableColumns(table, schema);
    const cursor = new ClickHouseCursor({
      query: qs.query,
      params: qs.params,
      client: this.client,
      chunkSize,
    });
    return { totalRows, columns, cursor };
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  wrapIdentifier(value: string): string {
    return TrinoData.wrapIdentifier(value);
  }

  static buildFilterString(filters: TableFilter[], columns = []) {
    let fullFilterString = "";
    let filterString = "";
    let filterParams = {};
    let paramCounter = 0;

    if (filters && _.isArray(filters) && filters.length > 0) {
      const filtersWithParams = [];
      const filtersWithoutParams = [];
      filters.forEach((item) => {
        const column = columns.find((c) => c.columnName === item.field);
        const field = column?.dataType.toUpperCase().includes("BINARY")
          ? `HEX(${TrinoData.wrapIdentifier(item.field)})`
          : TrinoData.wrapIdentifier(item.field);

        if (item.type === "in") {
          const params = _.isArray(item.value)
            ? item.value.map(() => `{p${paramCounter++}: Dynamic}`).join(",")
            : `{p${paramCounter++}: Dynamic}`;
          const values = _.isArray(item.value)
            ? item.value
                .map((v) => TrinoData.escapeString(v, true))
                .join(",")
            : TrinoData.escapeString(item.value, true);

          filtersWithParams.push(
            `${field} ${item.type.toUpperCase()} (${params})`
          );
          filtersWithoutParams.push(
            `${field} ${item.type.toUpperCase()} (${values})`
          );
        } else if (item.type.includes("is")) {
          filtersWithParams.push(`${field} ${item.type.toUpperCase()} NULL`);
          filtersWithoutParams.push(`${field} ${item.type.toUpperCase()} NULL`);
        } else {
          filtersWithParams.push(
            `${field} ${item.type.toUpperCase()} {p${paramCounter++}: Dynamic}`
          );
          filtersWithoutParams.push(
            `${field} ${item.type.toUpperCase()} ${TrinoData.escapeString(
              item.value as any,
              true
            )}`
          );
        }
      });

      filterString = "WHERE " + joinFilters(filtersWithParams, filters);
      fullFilterString = "WHERE " + joinFilters(filtersWithoutParams, filters);

      filters
        .filter((item) => !!item.value)
        .flatMap((item) => {
          return _.isArray(item.value) ? item.value : [item.value];
        })
        .forEach((str, idx) => {
          filterParams[`p${idx}`] = str;
        });
    }
    return {
      filterString,
      filterParams,
      fullFilterString,
    };
  }

  static buildSelectTopQuery(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    countTitle = "total",
    columns = [],
    selects = ["*"]
  ) {
    log.debug("building selectTop for", table, offset, limit, orderBy, selects);
    let orderByString = "";

    if (orderBy && orderBy.length > 0) {
      orderByString =
        "ORDER BY " +
        orderBy
          .map((item: any) => {
            if (_.isObject(item)) {
              return `${TrinoData.wrapIdentifier(item["field"])} ${item[
                "dir"
              ].toUpperCase()}`;
            } else {
              return TrinoData.wrapIdentifier(item);
            }
          })
          .join(",");
    }
    let filterString = "";
    let filterParams = {};
    let fullFilterString = "";
    if (_.isString(filters)) {
      filterString = fullFilterString = `WHERE ${filters}`;
    } else {
      const filterBlob = this.buildFilterString(filters, columns);
      filterString = filterBlob.filterString;
      filterParams = filterBlob.filterParams;
      fullFilterString = filterBlob.fullFilterString;
    }

    const selectSQL = `SELECT ${selects
      .map((s) => TrinoData.wrapIdentifier(s))
      .join(", ")}`;
    const baseSQL = `
      FROM ${TrinoData.wrapIdentifier(table)}
      ${filterString}
    `;
    const baseFullSQL = `
      FROM ${TrinoData.wrapIdentifier(table)}
      ${fullFilterString}
    `;
    const countSQL = `
      select count(*) as ${countTitle} ${baseSQL}
    `;
    const sql = `
      ${selectSQL} ${baseSQL}
      ${orderByString}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ""}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    `;
    const fullSql = `
      ${selectSQL} ${baseFullSQL}
      ${orderByString}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ""}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    `;

    return {
      query: sql,
      fullQuery: fullSql,
      countQuery: countSQL,
      params: filterParams,
    };
  }

  protected violatesReadOnly(statements: IdentifyResult[], options: any = {}) {
    return (
      super.violatesReadOnly(statements, options) ||
      (this.readOnlyMode && options.insert)
    );
  }

  parseTableColumn(column: { name: string }): BksField {
    return { name: column.name, bksType: "UNKNOWN" };
  }
}
