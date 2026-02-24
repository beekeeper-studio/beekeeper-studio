import rawLog from "@bksLogger";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "@/lib/db/clients/BasicDatabaseClient";
import { ClickhouseKnexClient } from "@shared/lib/knex-clickhouse";
import knexlib from "knex";
import {
  createClient,
  InsertParams,
  ResponseJSON,
  ClickHouseClient as NodeClickHouseClient,
} from "@clickhouse/client";
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
import { ClickHouseData } from "@shared/lib/dialects/clickhouse";
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
import { Stream } from "stream";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { ClickHouseChangeBuilder } from "@shared/lib/sql/change_builder/ClickHouseChangeBuilder";
import {
  buildDeleteQueries,
  buildSelectQueriesFromUpdates,
  buildUpdateQueries,
} from "@/lib/db/clients/utils";
import { uuidv4 } from "@/lib/uuid";
import { errors } from "@/lib/errors";
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { ClickHouseCursor } from "./clickhouse/ClickHouseCursor";

interface JSONResult {
  statement: IdentifyResult;
  data: ResponseJSON;
  resultType: "json";
}

interface StreamResult {
  statement: IdentifyResult;
  data: Stream;
  resultType: "stream";
}

type JSONOrStreamResult = JSONResult | StreamResult;

interface ResultColumn {
  name: string;
}

interface BaseResult {
  rows: any[][] | Record<string, any>[];
  columns: ResultColumn[]
  arrayMode: boolean;
}

type Result = BaseResult & JSONOrStreamResult;

interface ExecuteQueryOptions {
  params?: Record<string, any>;
  queryId?: string;
}

interface RawExecuteQueryOptions extends ExecuteQueryOptions {
  statements: IdentifyResult[];
  /** Run using insert method */
  insert?: InsertParams;
  arrayMode?: boolean;
}

const log = rawLog.scope("clickhouse");

const clickhouseContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(
    _query: string,
    _options: QueryLogOptions,
    _context: ExecutionContext
  ): Promise<number | string> {
    return null;
  },
};

const knex = knexlib({ client: ClickhouseKnexClient });

const RE_NULLABLE = /^Nullable\((.*)\)$/;
const RE_SELECT_FORMAT = /^\s*SELECT.+FORMAT\s+(\w+)\s*;?$/i;

export class ClickHouseClient extends BasicDatabaseClient<Result> {
  version: string;
  client: NodeClickHouseClient;
  supportsTransaction: boolean;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, clickhouseContext, server, database);
    this.dialect = "generic";
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect(): Promise<void> {
    await super.connect();

    let url: string;

    if (this.server.config.url) {
      url = this.server.config.url
    } else {
      const urlObj = new URL('http://example.com/');
      urlObj.hostname = this.server.config.host;
      urlObj.port = this.server.config.port.toString();
      urlObj.protocol = this.server.config.ssl ? 'https:' : 'http:';
      url = urlObj.toString();
    }

    this.client = createClient({
      url,
      username: this.server.config.user,
      password: this.server.config.password,
      database: this.database.database,
      application: "Beekeeper Studio",
      clickhouse_settings: {
        default_format: "JSONCompact",
      },
      request_timeout: 120_000, // 2 minutes
    });
    const result = await this.driverExecuteSingle(
      "SELECT version() AS version"
    );
    const json = result.data as ResponseJSON<{ version: string }>;
    const str = json.data[0].version;
    this.version = str.trim();
    this.supportsTransaction = await this.checkTransactionSupport();
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    await this.client.close();
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `SELECT name, engine FROM system.tables where database = currentDatabase() ORDER BY name`;
    const result = await this.driverExecuteSingle(sql);
    const json = result.data as ResponseJSON<{ name: string; engine: string }>;
    return json.data.map((row) => ({
      name: row.name,
      entityType: "table",
      engine: row.engine,
    }));
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
        default_expression
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

  async alterTable(change: AlterTableSpec): Promise<void> {
    const sql = await this.alterTableSql(change);
    const queries = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const query of queries) {
      await this.executeQuery(query);
    }
  }

  async getPrimaryKeys(
    table: string,
    _schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    log.debug("finding primary keys for", this.db, table);
    const result = await this.driverExecuteSingle(
      `
        SELECT name, position FROM system.columns
        WHERE database = currentDatabase()
          AND table = {table: String}
          AND is_in_primary_key = 1
      `,
      { params: { table } }
    );
    const json = result.data as ResponseJSON<{
      name: string;
      position: number;
    }>;
    return json.data.map((r) => ({
      columnName: r.name,
      position: r.position,
    }));
  }

  async getPrimaryKey(table: string, _schema?: string): Promise<string | null> {
    const res = await this.getPrimaryKeys(table);
    return res.length === 1 ? res[0].columnName : null;
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
    table: string,
    _schema?: string
  ): Promise<TableProperties> {
    const query = `
      SELECT
        comment,
        total_bytes
      FROM system.tables
      WHERE database = {database: String}
        AND table = {table: String}
    `;
    const params = { database: this.database.database, table };

    const [queryResult, relations, triggers, indexes] = await Promise.all([
      this.driverExecuteSingle(query, { params }),
      this.getTableKeys(table),
      this.listTableTriggers(table),
      this.listTableIndexes(table),
    ]);

    const json = queryResult.data as ResponseJSON<{
      comment: string;
      total_bytes: number;
    }>;

    return {
      description: json.data[0].comment,
      size: json.data[0].total_bytes,
      indexes,
      relations,
      triggers,
      partitions: [],
    };
  }

  async getOutgoingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    // Clickhouse does not support foreign keys.
    return [];
  }

  async getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
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
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const sql = `
      SHOW INDEX
        FROM ${ClickHouseData.wrapIdentifier(table)}
        IN ${ClickHouseData.wrapIdentifier(this.database.database)}
    `;

    const result = await this.driverExecuteSingle(sql);
    const json = result.data as ResponseJSON;

    const grouped = _.groupBy(json.data, "key_name");

    return Object.keys(grouped).map((key, idx) => {
      const row = grouped[key][0] as any;

      const columns: IndexColumn[] = grouped[key].map((r: any) => ({
        name: r.column_name,
        order: r.collation === "A" ? "ASC" : "DESC",
        prefix: r.sub_part, // Also called index prefix length.
      }));

      return {
        id: idx.toString(),
        table,
        schema: "",
        name: row.key_name as string,
        columns,
        unique: row.non_unique === "0",
        primary: row.key_name === "PRIMARY",
      };
    });
  }

  async listViews(
    _filter: FilterOptions = { schema: "public" }
  ): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM system.tables
      WHERE database = currentDatabase() AND engine = 'View'
      ORDER BY name
    `;
    const result = await this.driverExecuteSingle(sql);
    const json = result.data as ResponseJSON<{ name: string }>;
    return json.data.map((row) => ({
      name: row.name,
      entityType: "view",
    }));
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results: TableUpdateResult[] = [];

    await this.runWithTransaction(async () => {
      log.debug("Applying changes", changes);

      if (changes.inserts?.length) {
        for (const { table, data } of changes.inserts) {
          await this.driverExecuteSingle("", {
            insert: { table, values: data, format: "JSONEachRow" },
          });
        }
      }

      if (changes.updates?.length) {
        results = await this.updateValues(changes.updates);
      }

      if (changes.deletes?.length) {
        await this.deleteValues(changes.deletes);
      }
    });

    return results;
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
    let supportsTransaction = false;
    try {
      log.debug("Checking if transaction is supported");
      await this.driverExecuteSingle("BEGIN TRANSACTION");
      await this.driverExecuteSingle("ROLLBACK");
      supportsTransaction = true;
    } catch (e) {
      log.warn(e);
      log.debug("Transaction not supported");
    }
    return supportsTransaction;
  }

  private async updateValues(updates: TableUpdate[]) {
    log.info("Applying updates", updates);
    let results: TableUpdateResult[] = [];

    const updateQueries = buildUpdateQueries(this.knex, updates);
    for (const query of updateQueries) {
      await this.driverExecuteSingle(query);
    }

    const sqls = buildSelectQueriesFromUpdates(this.knex, updates);
    for (const sql of sqls) {
      const result = await this.driverExecuteSingle(sql);
      const json = result.data as ResponseJSON;
      results.push(json.data);
    }
    return results;
  }

  private async deleteValues(deletes: TableDelete[]) {
    log.info("Applying deletes", deletes);
    const targetTables = _.uniq(
      deletes.map((d) => ClickHouseData.escapeString(d.table, true))
    ).join(",");
    const result = await this.driverExecuteSingle(
      `SELECT table, engine FROM system.tables WHERE table IN (${targetTables})`
    );
    const json = result.data as ResponseJSON<{ table: string; engine: string }>;
    const tables = json.data;

    const mergeTreeTables = [];
    for (const { table, engine } of tables) {
      if (engine.includes("MergeTree")) {
        mergeTreeTables.push(table);
      }
    }

    const mergeTreeDeletes = deletes.filter((d) =>
      mergeTreeTables.includes(d.table)
    );
    const mergeTreeQueries = buildDeleteQueries(this.knex, mergeTreeDeletes);
    for (const query of mergeTreeQueries) {
      await this.driverExecuteSingle(query);
    }

    const nonMergeTreeDeletes = deletes.filter(
      (d) => !mergeTreeTables.includes(d.table)
    );

    for (const { table, primaryKeys } of nonMergeTreeDeletes) {
      let whereSql = "";
      for (const [idx, pk] of primaryKeys.entries()) {
        if (whereSql.length > 0) {
          whereSql += " AND ";
        }
        const column = ClickHouseData.wrapIdentifier(pk.column);
        whereSql += `${column} = {pk${idx}: String}`;
      }
      const sql = `ALTER TABLE {table: Identifier} DELETE WHERE ${whereSql}`;
      await this.driverExecuteSingle(sql, { params: { table } });
    }
  }

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    _schema?: string
  ): Promise<void> {
    let sql = "DROP ";

    if (typeOfElement === DatabaseElement.SCHEMA) {
      throw new Error("Schemas are not supported");
    } else if (typeOfElement === DatabaseElement.TABLE) {
      sql += "TABLE";
    } else if (
      typeOfElement === DatabaseElement.VIEW ||
      typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]
    ) {
      sql += "VIEW";
    } else if (typeOfElement === DatabaseElement.DATABASE) {
      sql += "DATABASE";
    }

    sql += ` ${ClickHouseData.wrapIdentifier(elementName)}`;

    await this.driverExecuteSingle(sql);
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = "SHOW DATABASES";
    const result = await this.driverExecuteSingle(sql);
    const json = result.data as ResponseJSON<{ name: string }>;
    return json.data.map((row) => row.name);
  }

  async createDatabase(
    databaseName: string,
    _charset: string,
    _collation: string
  ): Promise<string> {
    await this.driverExecuteSingle(
      `CREATE DATABASE ${ClickHouseData.wrapIdentifier(databaseName)}`
    );
    return databaseName;
  }

  async truncateElementSql(
    elementName: string,
    typeOfElement: DatabaseElement
  ) {
    if (typeOfElement === DatabaseElement.TABLE) {
      return `TRUNCATE TABLE ${ClickHouseData.wrapIdentifier(
        this.database.database
      )}.${ClickHouseData.wrapIdentifier(elementName)}`;
    }
    if (typeOfElement === DatabaseElement.DATABASE) {
      return `TRUNCATE DATABASE ${ClickHouseData.wrapIdentifier(elementName)}`;
    }
    return "";
  }

  async duplicateTable(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): Promise<void> {
    const sql = await this.duplicateTableSql(
      tableName,
      duplicateTableName,
      schema
    );
    const queries = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const query of queries) {
      await this.driverExecuteSingle(query);
    }
  }

  async duplicateTableSql(
    tableName: string,
    duplicateTableName: string,
    _schema?: string
  ): Promise<string> {
    tableName = `${ClickHouseData.wrapIdentifier(
      this.database.database
    )}.${ClickHouseData.wrapIdentifier(tableName)}`;
    duplicateTableName = `${ClickHouseData.wrapIdentifier(
      this.database.database
    )}.${ClickHouseData.wrapIdentifier(duplicateTableName)}`;
    return `
      CREATE TABLE ${duplicateTableName} AS ${tableName};
      INSERT INTO ${duplicateTableName} SELECT * FROM ${tableName};
    `;
  }

  async setElementNameSql(
    elementName: string,
    newElementName: string,
    typeOfElement: DatabaseElement
  ): Promise<string> {
    elementName = ClickHouseData.wrapIdentifier(elementName);
    newElementName = ClickHouseData.wrapIdentifier(newElementName);

    if (typeOfElement === DatabaseElement.DATABASE) {
      return `RENAME DATABASE ${elementName} TO ${newElementName};`;
    }
    if (
      typeOfElement === DatabaseElement.TABLE ||
      typeOfElement === DatabaseElement.VIEW ||
      typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]
    ) {
      return `RENAME TABLE ${elementName} TO ${newElementName};`;
    }

    return "";
  }

  async getBuilder(
    table: string,
    _schema?: string
  ): Promise<ChangeBuilderBase> {
    const columns = await this.listTableColumns(table);
    return new ClickHouseChangeBuilder(table, this.database.database, columns);
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

  async rawExecuteQuery(
    query: string,
    options: RawExecuteQueryOptions
  ): Promise<Result[]> {
    log.info(`Running Query`, query, options);

    if (options.insert) {
      await this.client.insert(options.insert as any);
      return [];
    }

    const results: Result[] = [];

    // Multi-statement is not supported so we need to execute each statement
    // one by one.
    for (const statement of options.statements) {
      const format = this.parseQueryFormat(statement.text);
      let resultType: Result["resultType"];
      let data: any;
      let rows: any[][] | Record<string, any>[] = [];
      let columns: ResultColumn[] = [];
      if (statement.executionType === "LISTING" && !format) {
        const result = await this.client.query({
          query: statement.text,
          query_params: options.params,
          query_id: options.queryId,
          format: options.arrayMode ? "JSONCompact" : "JSON",
        });
        data = await result.json();
        resultType = "json";
        rows = data.data;
        columns = data.meta;
      } else {
        const result = await this.client.exec({
          query,
          query_params: options.params,
          query_id: options.queryId,

          clickhouse_settings: {
            // Recommended for cluster usage to avoid situations where a query
            // processing error occurred after the response code, and HTTP
            // headers were already sent to the client.
            // See https://clickhouse.com/docs/en/interfaces/http/#response-buffering
            //
            // TODO (azmi): Using this setting can obscure the error message
            // (found in ClickHouse 24.2).
            wait_end_of_query: 1,
          },
        });
        data = result.stream;
        resultType = "stream";
      }
      results.push({ statement, data, resultType, rows, columns, arrayMode: options.arrayMode });
    }

    log.info(`Running Query Finished`);

    return results;
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
    };
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    // Clickhouse doesn't support routines
    return [];
  }

  async listMaterializedViewColumns(
    table: string,
    _schema?: string
  ): Promise<TableColumn[]> {
    const sql = `
      SELECT
        c.name AS name,
        c.type AS type,
        t.name AS table_name
      FROM system.tables AS t
      JOIN system.columns AS c
        ON c.table = t.name
        AND c.database = t.database
      WHERE t.database = currentDatabase()
        AND t.name = {table: String}
        AND t.engine = 'MaterializedView'
    `;
    const result = await this.driverExecuteSingle(sql, {
      params: { table },
    });
    const json = result.data as ResponseJSON<{
      name: string;
      type: string;
      table_name: string;
    }>;
    return json.data.map((row) => ({
      columnName: row.name,
      dataType: row.type,
      tableName: row.table_name,
    }));
  }

  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    // Clickhouse doesn't support schemas
    return [];
  }

  async getTableReferences(
    _table: string,
    _schema?: string
  ): Promise<string[]> {
    // Clickhouse does not support foreign keys.
    return [];
  }

  async getQuerySelectTop(
    table: string,
    limit: number,
    _schema?: string
  ): Promise<string> {
    return `SELECT * FROM ${ClickHouseData.wrapIdentifier(
      table
    )} LIMIT ${limit}`;
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM system.tables
      WHERE database = currentDatabase()
        AND engine = 'MaterializedView'
    `;
    const result = await this.driverExecuteSingle(sql);
    const json = result.data as ResponseJSON<{ name: string }>;
    return json.data.map((row) => ({
      name: row.name,
      entityType: "materialized-view",
    }));
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

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const result = await this.driverExecuteSingle(
      `
      SELECT create_table_query
      FROM system.tables
      WHERE name = {table: String}
    `,
      { params: { table } }
    );
    const json = result.data as ResponseJSON<{ create_table_query: string }>;
    return json.data[0]?.create_table_query || "";
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const result = await this.driverExecuteSingle(
      `
      SELECT create_table_query
      FROM system.tables
      WHERE database = currentDatabase()
        AND name = {view: String}
        AND engine = 'View'
    `,
      { params: { view } }
    );
    const json = result.data as ResponseJSON<{ create_table_query: string }>;
    return json.data.map((row) => row.create_table_query);
  }

  async getRoutineCreateScript(
    _routine: string,
    _type: string,
    _schema?: string
  ): Promise<string[]> {
    return [];
  }

  async setTableDescription(
    table: string,
    description: string,
    _schema?: string
  ): Promise<string> {
    const sql = `
      ALTER TABLE ${ClickHouseData.wrapIdentifier(table)}
      MODIFY COMMENT ${ClickHouseData.escapeString(description, true)}
    `;
    await this.driverExecuteSingle(sql);
    return description;
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    await this.driverExecuteSingle(
      `TRUNCATE ALL TABLES FROM currentDatabase()`
    );
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

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const cursorOpts = {
      query,
      params: [],
      client: this.client,
      chunkSize
    }

    const { columns, totalRows } = await this.getColumnsAndTotalRows(query);

    return {
      totalRows,
      columns,
      cursor: new ClickHouseCursor(cursorOpts)
    }
  }

  wrapIdentifier(value: string): string {
    return ClickHouseData.wrapIdentifier(value);
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
          ? `HEX(${ClickHouseData.wrapIdentifier(item.field)})`
          : ClickHouseData.wrapIdentifier(item.field);

        if (item.type === "in") {
          const params = _.isArray(item.value)
            ? item.value.map(() => `{p${paramCounter++}: Dynamic}`).join(",")
            : `{p${paramCounter++}: Dynamic}`;
          const values = _.isArray(item.value)
            ? item.value
                .map((v) => ClickHouseData.escapeString(v, true))
                .join(",")
            : ClickHouseData.escapeString(item.value, true);

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
            `${field} ${item.type.toUpperCase()} ${ClickHouseData.escapeString(
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
              return `${ClickHouseData.wrapIdentifier(item["field"])} ${item[
                "dir"
              ].toUpperCase()}`;
            } else {
              return ClickHouseData.wrapIdentifier(item);
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
      .map((s) => ClickHouseData.wrapIdentifier(s))
      .join(", ")}`;
    const baseSQL = `
      FROM ${ClickHouseData.wrapIdentifier(table)}
      ${filterString}
    `;
    const baseFullSQL = `
      FROM ${ClickHouseData.wrapIdentifier(table)}
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

  private parseQueryFormat(query: string): string {
    const match = query.match(RE_SELECT_FORMAT);
    if (match && match[1]) {
      return match[1];
    }
    return "";
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
