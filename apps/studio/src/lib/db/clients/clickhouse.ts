import rawLog from "electron-log";
import { DatabaseElement, IDbConnectionDatabase } from "../types";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "./BasicDatabaseClient";
import { ClickhouseKnexClient } from "@shared/lib/knex-clickhouse-temp";
import knexlib from "knex";
import { createClient, DataFormat, InsertParams } from "@clickhouse/client";
import { NodeClickHouseClient } from "@clickhouse/client/dist/client";
import { ResultJSONType } from "@clickhouse/client-common/dist/result";
import {
  CancelableQuery,
  DatabaseFilterOptions,
  ExtendedTableColumn,
  FieldDescriptor,
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
} from "../models";
import { ClickHouseData } from "@shared/lib/dialects/clickhouse";
import _ from "lodash";
import {
  createCancelablePromise,
  joinFilters,
  streamToBuffer,
  streamToString,
} from "@/common/utils";
import { IndexColumn, TableKey } from "@shared/lib/dialects/models";
import { Stream } from "stream";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { ClickHouseChangeBuilder } from "@shared/lib/sql/change_builder/ClickHouseChangeBuilder";
import {
  applyChangesSql,
  buildDeleteQueries,
  buildUpdateQueries,
} from "./utils";
import { uuidv4 } from "@/lib/uuid";
import { errors } from "@/lib/errors";
import { IDbConnectionServer } from "../backendTypes";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { ClickHouseCursor } from "./clickhouse/ClickHouseCursor";

interface Result<T = unknown, F = unknown> {
  statement: IdentifyResult;
  data: ResultJSONType<T, F> | Stream;
}

interface ExecuteQueryOptions {
  params?: Record<string, any>;
  format?: DataFormat;
  queryId?: string;
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

export class ClickHouseClient extends BasicDatabaseClient<Result> {
  version: string;
  _client: NodeClickHouseClient;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, clickhouseContext, server, database);
  }

  async connect(): Promise<void> {
    await super.connect();
    this._client = createClient({
      url: this.server.config.url,
      username: this.server.config.user,
      password: this.server.config.password,
      database: this.database.database,
      application: "Beekeeper Studio",
    });
    const { data } = await this.driverExecuteSingle(
      "SELECT version() AS version"
    );
    const str = await streamToString(data as Stream);
    this.version = str.trim();
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    await this._client.close();
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `SELECT name, engine FROM system.tables where database = {database: String} ORDER BY name`;
    const { data } = await this.driverExecuteSingle(sql, {
      params: { database: this.database.database },
      format: "JSONEachRow",
    });
    return data.map((row) => ({
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
        default_expression,
      FROM system.columns
      WHERE database = {database: String}
        ${table ? "AND table = {table: String}" : ""}
      ORDER BY position
    `;
    const { data } = await this.driverExecuteSingle(sql, {
      params: { database: this.database.database, table },
      format: "JSONEachRow",
    });
    return data.map((row) => {
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
      };
    });
  }

  async getPrimaryKeys(
    table: string,
    _schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    log.debug("finding primary keys for", this.db, table);

    const { data } = (await this.driverExecuteSingle(
      `
        SELECT name, position FROM system.columns
        WHERE database = {database: String}
          AND table = {table: String}
          AND is_in_primary_key = 1
      `,
      {
        params: { database: this.database.database, table },
        format: "JSONEachRow",
      }
    )) as any;

    if (data.length === 0) return [];

    return data.map((r) => ({
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

    const { query, params } = queries;

    const { data } = await this.driverExecuteSingle(query, {
      params,
      format: "JSONEachRow",
    });
    return {
      result: data as any[],
      fields: Object.keys(data[0] || {}),
    };
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

    const [{ data: info }, relations, triggers, indexes] = await Promise.all([
      this.driverExecuteSingle(query, { params, format: "JSONEachRow" }),
      this.getTableKeys(table),
      this.listTableTriggers(table),
      this.listTableIndexes(table),
    ]);

    return {
      description: info[0].comment,
      size: info[0].total_bytes,
      indexes,
      relations,
      triggers,
      partitions: [],
    };
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
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const sql = `
      SHOW INDEX
        FROM ${ClickHouseData.wrapIdentifier(table)}
        IN ${ClickHouseData.wrapIdentifier(this.database.database)}
    `;

    const { data } = await this.driverExecuteSingle(sql, {
      format: "JSONEachRow",
    });

    const grouped = _.groupBy(data, "key_name");

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
      SELECT
        table_schema as schema,
        table_name as name
      FROM information_schema.views
      ORDER BY table_schema, table_name
    `;
    const { data } = await this.driverExecuteSingle(sql, {
      format: "JSONEachRow",
    });
    return data as TableOrView[];
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    return applyChangesSql(changes, this.knex);
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
    let results: TableUpdateResult[] = [];

    await this.runWithTransactionIfSupported(async () => {
      log.debug("Applying changes", changes);

      if (changes.inserts) {
        for (const { table, data } of changes.inserts) {
          await this.driverExecuteSingle("", {
            insert: { table, values: data, format: "JSONEachRow" },
          });
        }
      }

      if (changes.updates) {
        results = await this.updateValues(changes.updates);
      }

      if (changes.deletes) {
        await this.deleteValues(changes.deletes);
      }
    });

    return results;
  }

  private async runWithTransactionIfSupported(fn: () => Promise<any>) {
    let supportsTransaction = false;

    try {
      log.debug("Checking if transaction is supported");
      await this.driverExecuteSingle("BEGIN TRANSACTION");
      supportsTransaction = true;
    } catch (e) {
      log.error(e);
      log.debug("Transaction not supported");
    }

    try {
      await fn();
      if (supportsTransaction) {
        await this.driverExecuteSingle("COMMIT");
      }
    } catch (e) {
      log.error(e);
      if (supportsTransaction) {
        await this.driverExecuteSingle("ROLLBACK");
      }
      throw e;
    }
  }

  private async updateValues(updates: TableUpdate[]) {
    log.info("Applying updates", updates);
    let results: TableUpdateResult[] = [];

    const updateQueries = buildUpdateQueries(this.knex, updates);
    for (const query of updateQueries) {
      await this.driverExecuteSingle(query);
    }

    const { table, primaryKeys } = updates[0];
    let sql = "SELECT * FROM {table: Identifier} WHERE ";
    sql += primaryKeys
      .map((_p, idx) => `{col${idx}: Identifier} = {val${idx}: Dynamic}`)
      .join(" AND ");
    const valueParams = primaryKeys.reduce(
      (acc, p, idx) => ({
        ...acc,
        [`col${idx}`]: p.column,
        [`val${idx}`]: p.value,
      }),
      {}
    );
    const data = await this.driverExecuteSingle(sql, {
      params: { table, ...valueParams },
      format: "JSONEachRow",
    });
    results.push(data);

    return results;
  }

  private async deleteValues(deletes: TableDelete[]) {
    log.info("Applying deletes", deletes);
    const targetTables = _.uniq(
      deletes.map((d) => ClickHouseData.escapeString(d.table, true))
    ).join(",");
    const { data: tables } = (await this.driverExecuteSingle(
      `SELECT table, engine FROM system.tables WHERE table IN (${targetTables})`,
      { format: "JSONEachRow" }
    )) as any;

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
      const wrappedTable = ClickHouseData.wrapIdentifier(table);
      let whereSql = "";
      for (const [_, pk] of primaryKeys.entries()) {
        if (whereSql.length > 0) {
          whereSql += " AND ";
        }
        const column = ClickHouseData.wrapIdentifier(pk.column);
        const value = ClickHouseData.escapeString(pk.value, true);
        whereSql += `${column} = ${value}`;
      }
      const sql = `ALTER TABLE ${wrappedTable} DELETE WHERE ${whereSql}`;
      await this.driverExecuteSingle(sql);
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
    const { data } = await this.driverExecuteSingle(sql, {
      format: "JSONEachRow",
    });
    return data.map((row) => row.name);
  }

  async createDatabase(
    databaseName: string,
    _charset: string,
    _collation: string
  ): Promise<void> {
    await this.driverExecuteSingle(
      `CREATE DATABASE ${ClickHouseData.wrapIdentifier(databaseName)}`
    );
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
    _schema?: string
  ): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName);
    await this.driverExecuteSingle(sql);
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
    let uuid = uuidv4();
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText, {
              queryId: uuid,
              format: "JSONCompact",
            }),
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
        await this.driverExecuteSingle(`KILL QUERY WHERE query_id='${uuid}'`);
        cancelable.cancel();
      },
    };
  }

  async executeQuery(
    queryText: string,
    options?: ExecuteQueryOptions
  ): Promise<NgQueryResult[]> {
    // FIXME (azmi): this is a mess. we should probably limit the format to
    // JSONCompact for now
    const containsMeta = options?.format?.match(
      /^(JSON|JSONStrings|JSONCompact|JSONCompactStrings|JSONColumnsWithMetadata)$/
    );
    const result = (await this.driverExecuteMultiple(
      queryText,
      options
    )) as any;
    const ret = [];
    for (let { statement, data } of result) {
      if (data instanceof Stream) {
        ret.push({
          fields: [
            {
              id: "c0",
              name: "Result",
            },
          ],
          affectedRows: undefined, // TODO (azmi): implement affectedRows
          command: statement.type,
          rows: [{ c0: await streamToBuffer(data) }],
          rowCount: 0,
        });
        continue;
      }

      let fields: FieldDescriptor[];

      if (containsMeta) {
        fields = data.meta.map((field, idx) => ({
          id: `c${idx}`,
          name: field.name,
          dataType: field.type,
        }));
      } else {
        fields = Object.keys(data[0]).map((key, idx) => ({
          id: `c${idx}`,
          name: key,
        }));
      }

      if (containsMeta) {
        data = data.data.map((row: any[]) =>
          row.reduce((obj, value, idx) => ({ ...obj, [`c${idx}`]: value }), {})
        );
      }
      ret.push({
        fields,
        affectedRows: undefined,
        command: statement.type,
        rows: data,
        rowCount: data.length,
      });
    }
    return ret;
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
          c.name as name,
          c.type as type,
          v.table_name as table_name
      FROM information_schema.views v
      JOIN system.columns c
        ON c.table = v.table_name
        AND c.database = v.table_schema
      WHERE v.is_insertable_into = 'YES'
        AND v.table_name = {table: String}
    `;
    const { data } = await this.driverExecuteSingle(sql, {
      format: "JSONEachRow",
      params: { table },
    });
    return data.map(
      (row) =>
        ({
          columnName: row.name,
          dataType: row.type,
          tableName: row.table_name,
        } as TableColumn)
    );
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
      SELECT v.table_name as name
      FROM information_schema.views v
      WHERE v.is_insertable_into = 'YES'
    `;
    const { data } = await this.driverExecuteSingle(sql, {
      format: "JSONEachRow",
    });
    return data.map(
      (row) =>
        ({ name: row.name, entityType: "materialized-view" } as TableOrView)
    );
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
    const { data } = await this.driverExecuteSingle(
      `
        SELECT create_table_query
        FROM system.tables
        WHERE name = {table: String}
      `,
      { format: "JSONEachRow", params: { table } }
    );

    return data[0]?.create_table_query || "";
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const { data } = await this.driverExecuteSingle(
      `
        SELECT view_definition
        FROM information_schema.views
        WHERE table_name = {view: String}
      `,
      { format: "JSONEachRow", params: { view } }
    );
    return data.map((row) => row.view_definition);
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
    const { data } = await this.driverExecuteSingle(
      `SELECT count() as count FROM {table: Idenfifier}`,
      { params: { table } }
    );
    return data[0].count;
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
    const { data } = await this.driverExecuteSingle(qs.countQuery, {
      params: qs.params,
      format: "JSONEachRow",
    });
    const totalRows = Number(data[0].total) || 0;
    const columns = await this.listTableColumns(table, schema);
    const cursor = new ClickHouseCursor({
        table,
        orderBy,
        filters,
        client: this._client,
        chunkSize,
      }),

    return { totalRows, columns, cursor };
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  wrapIdentifier(value: string): string {
    return ClickHouseData.wrapIdentifier(value);
  }

  async rawExecuteQuery(
    query: string,
    options: ExecuteQueryOptions & {
      statements: IdentifyResult[];
      /** Run using insert method */
      insert?: InsertParams;
    }
  ): Promise<Result[]> {
    log.info(`Running Query`, query, options);
    // console.log(
    //   `Running Query`,
    //   query,
    //   options.insert && JSON.stringify(options.insert, null, 2)
    // );

    const results = [];

    if (options.insert) {
      await this._client.insert(options.insert as any);
    } else {
      // Multi-statement is not supported so we need to execute each statement
      // one by one.
      for (const statement of options.statements) {
        // console.log("running", statement.text);
        if (options.format?.includes("JSON")) {
          const resultSet = await this._client.query({
            query: statement.text,
            query_params: options.params,
            format: options.format,
            query_id: options.queryId,
          });
          results.push({ statement, data: await resultSet.json() });
        } else {
          const resultSet = await this._client.exec({
            query: options.format
              ? `${statement.text} FORMAT ${options.format}`
              : statement.text,
            query_params: options.params,
            query_id: options.queryId,

            // Recommended for cluster usage to avoid situations where a query
            // processing error occurred after the response code, and HTTP
            // headers were already sent to the client.
            // See https://clickhouse.com/docs/en/interfaces/http/#response-buffering
            clickhouse_settings: {
              wait_end_of_query: 1,
            },
          });
          results.push({ statement, data: resultSet.stream });
        }
      }

      log.info(`Running Query Finished`);
    }

    return results;
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
}
