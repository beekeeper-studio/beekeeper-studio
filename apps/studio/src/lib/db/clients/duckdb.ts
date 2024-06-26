import {
  DatabaseElement,
  IDbConnectionDatabase,
  IDbConnectionServer,
} from "../types";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "./BasicDatabaseClient";
import {
  buildInsertQueries,
  buildDeleteQueries,
  applyChangesSql,
  buildSchemaFilter,
} from "./utils";
import knexlib from "knex";
import _ from "lodash";
import rawLog from "electron-log";
import { Client_DuckDB as DuckDBKnexClient } from "@shared/lib/knex-duckdb";
import Client from "knex/lib/client";
import { Database, Connection } from "duckdb-async";
import { identify } from "sql-query-identifier";
import {
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
  TableFilter,
  TableIndex,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger,
  TableUpdate,
  TableUpdateResult,
  TableColumn,
} from "@/lib/db/models";
import { joinFilters } from "@/common/utils";
import { DuckDBCursor } from "./duckdb/DuckDBCursor";
import { ColumnInfo, TableData } from "duckdb";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { DuckDBChangeBuilder } from "@shared/lib/sql/change_builder/DuckDBChangeBuilder";
import { DuckDBData } from "@shared/lib/dialects/duckdb";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { TableKey } from "@shared/lib/dialects/models";

const log = rawLog.scope("duckdb");

const duckDBContext = {
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

type DuckDBResult = {
  data: Record<string, any>[];
  columns: ColumnInfo[];
  statement: IdentifyResult;
};

export class DuckDBClient extends BasicDatabaseClient<DuckDBResult> {
  version: string;
  databasePath: string;
  databaseInstance: Database;
  // We only use one connection to be able to read and write at the same time
  // https://duckdb.org/docs/connect/concurrency#handling-concurrency
  connectionInstance: Connection;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, duckDBContext, server, database);

    this.dialect = "generic"; // TODO try 'duckdb'
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.databasePath = database?.database;
  }

  getBuilder(table: string, schema: string): ChangeBuilderBase {
    return new DuckDBChangeBuilder(table, schema);
  }

  supportedFeatures(): SupportedFeatures {
    return {
      customRoutines: false,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
    };
  }

  versionString(): string {
    return this.version;
  }

  async connect(): Promise<void> {
    await super.connect();

    this.databaseInstance = await Database.create(this.databasePath || ":memory:", {
      access_mode: this.readOnlyMode ? "READ_ONLY" : "READ_WRITE",
    });
    this.connectionInstance = await this.databaseInstance.connect();

    this.knex = knexlib({
      client: DuckDBKnexClient as Client,
      connection: {
        // @ts-expect-error
        connectionInstance: this.connectionInstance.conn,
      },
    });

    const result = await this.driverExecuteSingle("SELECT version()");

    this.version = result.data[0]["version()"];
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    // connectionInstance is closed by knex in super.disconnect()
    // so no need to close this.connectionInstance
    // await this.connectionInstance.close();
    await this.databaseInstance.close();
  }

  query(queryText: string, options?: any): CancelableQuery {
    return {
      execute: async () => {
        return await this.executeQuery(queryText, options);
      },
      cancel: async () => {
        // TODO how to cancel
      },
    };
  }

  async executeQuery(
    queryText: string,
    options?: any
  ): Promise<NgQueryResult[]> {
    const results = await this.driverExecuteMultiple(queryText, options);

    return results.map(({ data, columns }) => {
      const fields = columns.map((field, idx) => ({
        id: `c${idx}`,
        name: field.type.alias || field.name,
        type: field.type.sql_type,
      }));

      const rows = data.map((row) => {
        const obj = {};
        for (const field of fields) {
          obj[field.id] = row[field.name];
        }
        return obj;
      });

      return { fields, rows };
    });
  }

  // TODO not sure what DatabaseFilterOptions is. it might be possible to
  // implement it.
  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const { data } = await this.driverExecuteSingle(`
      SELECT database_name FROM duckdb_databases
    `);
    return data.map((row) => row.database_name);
  }

  async getTableProperties(
    table: string,
    schema: string
  ): Promise<TableProperties | null> {
    const result = await this.driverExecuteSingle(
      `
        SELECT
          comment,
          estimated_size,
          index_count
        FROM duckdb_tables
        WHERE schema_name = ?
          AND table_name = ?
      `,
      { params: [schema, table] }
    );

    const data = result.data[0];
    const indexes = this.listTableIndexes(table, schema);
    const triggers = this.listTableTriggers(table, schema);

    return {
      description: data.comment,
      size: data.estimated_size,
      indexSize: data.index_count,
      indexes: await indexes,
      relations: [], // TODO
      triggers: await triggers,
      owner: "", // TODO
      createdAt: "", // TODO
    };
  }

  getQuerySelectTop(table: string, limit: number, schema: string): string {
    schema = DuckDBData.wrapLiteral(schema);
    table = DuckDBData.wrapIdentifier(table);
    return `SELECT * FROM ${schema}.${table} LIMIT ${limit}`;
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    let query = "SELECT table_name, schema_name FROM duckdb_tables";
    const options = { params: [] }
    if (filter?.schema) {
      query += ` WHERE schema_name = ?`;
      options.params = [filter.schema]
    }
    const { data } = await this.driverExecuteSingle(query, options);
    const tables: TableOrView[] = data.map((row: any) => ({
      schema: row.schema_name,
      name: row.table_name,
      entityType: "table",
    }));
    return tables;
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    let query = "SELECT view_name, schema_name FROM duckdb_views";
    const options = { params: [] }
    if (filter?.schema) {
      query += ` WHERE schema_name = ?`;
      options.params = [filter.schema]
    }
    const { data } = await this.driverExecuteSingle(query, options);
    const views: TableOrView[] = data.map((row: any) => ({
      schema: row.schema_name,
      name: row.view_name,
      entityType: "view",
    }));
    return views;
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return []; // TODO not sure if duckdb has routines
  }

  async listMaterializedViewColumns(
    _table: string,
    _schema?: string
  ): Promise<TableColumn[]> {
    return []; // Not supported yet. https://github.com/duckdb/duckdb/discussions/3638
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return []; // Not supported yet. https://github.com/duckdb/duckdb/discussions/3638
  }

  async listTableColumns(
    table?: string,
    schema?: string
  ): Promise<ExtendedTableColumn[]> {
    const params: { column: string; value: string }[] = [];
    let query = `
        SELECT
          schema_name,
          table_name,
          column_name,
          column_index,
          data_type,
          is_nullable,
          column_default,
          comment
        FROM duckdb_columns
      `;

    if (table) {
      params.push({ column: "table_name", value: table });
    }

    if (schema) {
      params.push({ column: "schema_name", value: schema });
    }

    if (params.length > 0) {
      const conditions = params
        .map((p) => `${p.column} = ?`)
        .join(" AND ");
      query += ` WHERE ${conditions}`;
    }

    const { data } = await this.driverExecuteSingle(query, { params: [...params.map((p) => p.value)] });
    return data.map(
      (row: any): ExtendedTableColumn => ({
        schemaName: row.schema_name,
        tableName: row.table_name,
        columnName: row.column_name,
        ordinalPosition: row.column_index,
        dataType: row.data_type,
        nullable: row.is_nullable,
        defaultValue: row.column_default,
        hasDefault: !_.isNil(row.column_default),
        comment: row.comment,
      })
    );
  }

  async listTableTriggers(
    _table: string,
    _schema: string
  ): Promise<TableTrigger[]> {
    // DuckDB doesn't support table triggers
    // https://github.com/duckdb/duckdb/issues/750
    return [];
  }

  async listTableIndexes(
    table: string,
    schema?: string
  ): Promise<TableIndex[]> {
    const { data } = await this.driverExecuteSingle(
      `
        SELECT
          schema_name,
          table_name,
          index_name,
          index_oid,
          comment,
          is_unique,
          is_primary
        FROM duckdb_indexes
        WHERE table_name = ?
          AND schema_name = ?
      `,
      { params: [table, schema] }
    );

    return data.map((row) => ({
      id: row.index_oid,
      table: row.table_name,
      schema: row.schema_name,
      name: row.index_name,
      columns: [], // TODO
      unique: row.is_unique,
      primary: row.is_primary,
    }));
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const filterQuery = buildSchemaFilter(filter);
    const { data } = await this.driverExecuteSingle(`
      SELECT DISTINCT schema_name
      FROM information_schema.schemata
      ${filterQuery ? "WHERE " + filterQuery : ""}
    `);
    return data.map((row) => row.schema_name);
  }

  async getTableReferences(_table: string, _schema: string): Promise<string[]> {
    return []; // TODO: not implemented yet
  }

  async getTableKeys(_table: string, _schema: string): Promise<TableKey[]> {
    // toTable: string;
    // toSchema: string;
    // toColumn: string;
    // fromTable: string;
    // fromSchema: string;
    // fromColumn: string;
    // constraintName?: string;
    // onUpdate?: string;
    // onDelete?: string;
    // const { data } = await this.driverExecuteSingle(`
    //   SELECT
    //
    //
    //
    // `);
    return []; // TODO
  }

  protected async rawExecuteQuery(
    q: string,
    options: any
  ): Promise<DuckDBResult | DuckDBResult[]> {
    const queries = identify(q, { strict: false });
    const params = options.params;
    const results = [];
    const conn: Connection = options.connection || this.connectionInstance;

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      try {
        const statement = await conn.prepare(query.text);
        let rows: TableData;

        if (params) {
          rows = await statement.all(...params);
        } else {
          rows = await statement.all();
        }

        const columns = statement.columns();
        await statement.finalize();

        results.push({
          data: rows,
          columns,
          statement: query,
        });
      } catch (error) {
        log.error(error);
        throw error;
      }
    }

    return options.multiple ? results : results[0];
  }

  async getPrimaryKey(table: string, schema: string): Promise<string> {
    const keys = await this.getPrimaryKeys(table, schema);
    return keys.length === 1 ? keys[0].columnName : null;
  }

  async getPrimaryKeys(
    table: string,
    schema: string
  ): Promise<PrimaryKeyColumn[]> {
    const keys: PrimaryKeyColumn[] = [];

    const sql = `
      SELECT
        constraint_column_indexes,
        constraint_column_names
      FROM duckdb_constraints
      WHERE schema_name = ?
        AND table_name = ?
        AND constraint_type = 'PRIMARY KEY'
    `;

    const { data } = await this.driverExecuteSingle(sql, { params: [schema, table] });

    data.forEach((row: any) => {
      const columnNames: string[] = row.constraint_column_names;
      columnNames.forEach((name, idx) => {
        keys.push({
          columnName: name,
          position: Number(row.constraint_column_indexes[idx]),
        });
      });
    });

    return keys;
  }

  async listCollations(): Promise<string[]> {
    const result = await this.driverExecuteSingle("PRAGMA collations");
    return result.data.map((row) => row.collname);
  }

  async listCharsets(): Promise<string[]> {
    // No charsets in the docs
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    // No charsets in the docs
    return "";
  }

  /**
   * @param {string} databaseName - A path to a file
   */
  async createDatabase(
    databaseName: string,
    _charset: string,
    _collation: string
  ): Promise<void> {
    const database = await Database.create(databaseName);
    await database.close();
  }

  createDatabaseSQL(): string {
    throw new Error("Method not implemented.");
  }

  async getTableCreateScript(table: string, schema: string): Promise<string> {
    const { data } = await this.driverExecuteSingle(
      `
        SELECT sql
        FROM duckdb_tables
        WHERE table_name = ?
        AND schema_name = ?
      `,
      { params: [table, schema] }
    );
    return data[0].sql;
  }

  async getViewCreateScript(view: string, schema: string): Promise<string[]> {
    const { data } = await this.driverExecuteSingle(
      `
        SELECT sql
        FROM duckdb_views
        WHERE view_name = ?
        AND schema_name = ?
      `,
      { params: [view, schema] }
    );
    return data.map((row) => row.sql);
  }

  async getRoutineCreateScript(
    _routine: string,
    _type: string,
    _schema: string
  ): Promise<string[]> {
    return []; // TODO not sure if duckdb has routines
  }

  applyChangesSql(changes: TableChanges): string {
    return applyChangesSql(changes, this.knex);
  }

  async applyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    let results = [];

    await this.driverExecuteSingle("BEGIN TRANSACTION");

    try {
      if (changes.inserts) {
        for (const command of buildInsertQueries(this.knex, changes.inserts)) {
          await this.driverExecuteSingle(command);
        }
      }

      if (changes.updates) {
        results = await this.updateValues(changes.updates);
      }

      if (changes.deletes) {
        for (const command of buildDeleteQueries(this.knex, changes.deletes)) {
          await this.driverExecuteSingle(command);
        }
      }

      await this.driverExecuteSingle("COMMIT");
    } catch (ex) {
      log.error("query exception: ", ex);
      await this.driverExecuteSingle("ROLLBACK");
      throw ex;
    }

    return results;
  }

  async setTableDescription(
    table: string,
    description: string,
    schema: string
  ): Promise<string> {
    await this.driverExecuteSingle(
      `COMMENT ON TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(
        table
      )} IS '${description}'`
    );
    const result = await this.getTableProperties(table, schema);
    return result.description;
  }

  setElementNameSql(
    elementName: string,
    newElementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): string {
    elementName = schema
      ? `${DuckDBData.wrapIdentifier(schema)}.${DuckDBData.wrapIdentifier(elementName)}`
      : DuckDBData.wrapIdentifier(elementName);
    newElementName = DuckDBData.wrapIdentifier(newElementName);

    let sql = "";

    if (typeOfElement === DatabaseElement.TABLE) {
      sql = `ALTER TABLE ${elementName} RENAME TO ${newElementName}`;
    } else if (typeOfElement === DatabaseElement.VIEW) {
      sql = `ALTER VIEW ${elementName} RENAME TO ${newElementName}`;
    } else if (typeOfElement === DatabaseElement.SCHEMA) {
      sql = `ALTER SCHEMA ${elementName} RENAME TO ${newElementName}`;
    }

    return sql;
  }

  truncateElementSql(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): string {
    // TODO
    console.log(elementName, typeOfElement, schema);
    throw new Error("Method not implemented.");
  }

  private async updateValues(updates: TableUpdate[]) {
    const commands = updates.map((update) => {
      const params = [
        _.isBoolean(update.value) ? _.toInteger(update.value) : update.value,
      ];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${DuckDBData.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");
      const schema = DuckDBData.wrapIdentifier(update.schema);
      const table = DuckDBData.wrapIdentifier(update.table);
      const column = DuckDBData.wrapIdentifier(update.column);

      return {
        query: `UPDATE ${schema}.${table} SET ${column} = ? WHERE ${where}`,
        params: params,
      };
    });

    const results = [];
    for (let index = 0; index < commands.length; index++) {
      const blob = commands[index];
      await this.driverExecuteSingle(blob.query, {
        params: blob.params,
      });
    }

    const returnQueries = updates.map((update) => {
      const params = [];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${DuckDBData.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");
      const schema = DuckDBData.wrapIdentifier(update.schema);
      const table = DuckDBData.wrapIdentifier(update.table);

      return {
        query: `select * from ${schema}.${table} where ${where}`,
        params: params,
      };
    });

    for (let index = 0; index < returnQueries.length; index++) {
      const blob = returnQueries[index];
      const r = await this.driverExecuteSingle(blob.query, {
        params: blob.params,
      });
      if (r.data[0]) results.push(r.data[0]);
    }

    return results;
  }

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema: string
  ): Promise<void> {
    let query: string;

    if (typeOfElement === DatabaseElement["TABLE"]) {
      query = "DROP TABLE";
    } else if (
      typeOfElement === DatabaseElement["VIEW"] ||
      typeOfElement === DatabaseElement["MATERIALIZED-VIEW"]
    ) {
      query = "DROP VIEW";
    } else {
      throw new Error(`Dropping ${typeOfElement} is not supported.`);
    }

    elementName = DuckDBData.wrapIdentifier(elementName);
    schema = DuckDBData.wrapIdentifier(schema);

    await this.driverExecuteSingle(`${query} ${schema}.${elementName}`);
  }

  async truncateElement(
    elementName: string,
    _typeOfElement: DatabaseElement,
    schema: string
  ): Promise<void> {
    const query = `TRUNCATE ${DuckDBData.wrapIdentifier(
      schema
    )}.${DuckDBData.wrapIdentifier(elementName)}`;
    await this.driverExecuteSingle(query);
  }

  async truncateAllTables(schema: string): Promise<void> {
    const tables = await this.listTables({ schema });
    for (const table of tables) {
      await this.truncateElement(table.name, DatabaseElement.TABLE, schema);
    }
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema: string,
    selects?: string[]
  ): Promise<TableResult> {
    const query = await this.selectTopSql(
      table,
      offset,
      limit,
      orderBy,
      filters,
      schema,
      selects
    );
    const result = await this.driverExecuteSingle(query);

    return {
      result: result.data,
      fields: Object.keys(result.data[0] || {}),
    };
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema: string,
    selects?: string[]
  ): Promise<string> {
    const columns = await this.listTableColumns(table);
    const { query, params } = DuckDBClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      schema,
      "total",
      columns,
      selects
    );
    return this.knex.raw(query, params).toQuery();
  }

  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number,
    schema: string
  ): Promise<StreamResults> {
    const columns = await this.listTableColumns(table, schema);
    const totalRows = await this.getTableLength(table, schema);
    const options = { schema, table, orderBy, filters, chunkSize };
    const cursor = new DuckDBCursor(this, options);
    return { totalRows, columns, cursor };
  }

  async queryStream(
    _query: string,
    _chunkSize: number
  ): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  async getTableLength(table: string, schema: string): Promise<number> {
    const { countQuery, params } = DuckDBClient.buildSelectTopQuery(
      table,
      undefined,
      undefined,
      undefined,
      undefined,
      schema
    );
    const countResults = await this.driverExecuteSingle(countQuery, { params });
    const rowWithTotal = countResults.data.find((row) => {
      return row.total;
    });
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0;
    return Number(totalRecords);
  }

  async duplicateTable(
    tableName: string,
    duplicateTableName: string,
    schema: string
  ): Promise<void> {
    const query = this.duplicateTableSql(tableName, duplicateTableName, schema);
    await this.driverExecuteSingle(query);
  }

  duplicateTableSql(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): string {
    tableName = DuckDBData.wrapIdentifier(tableName);
    duplicateTableName = DuckDBData.wrapIdentifier(duplicateTableName);
    schema = DuckDBData.wrapIdentifier(schema);

    return `
      CREATE TABLE ${schema}.${duplicateTableName}
      AS SELECT * FROM ${schema}.${tableName}
    `;
  }

  // TODO put this somewhere else
  static buildSelectTopQuery(
    table: string,
    offset?: number,
    limit?: number,
    orderBy?: OrderBy[],
    filters?: string | TableFilter[],
    schema?: string,
    countTitle = "total",
    columns: ExtendedTableColumn[] = [],
    selects = ["*"]
  ) {
    log.debug(
      "building selectTop for",
      table,
      offset,
      limit,
      orderBy,
      schema,
      selects
    );
    let orderByString = "";

    if (orderBy && orderBy.length > 0) {
      orderByString =
        "ORDER BY " +
        orderBy
          .map((item: any) => {
            if (_.isObject(item)) {
              return `${DuckDBData.wrapIdentifier(item["field"])} ${item[
                "dir"
              ].toUpperCase()}`;
            } else {
              return DuckDBData.wrapIdentifier(item);
            }
          })
          .join(",");
    }
    let filterString = "";
    let filterParams = [];
    if (_.isString(filters)) {
      filterString = `WHERE ${filters}`;
    } else if (_.isArray(filters)) {
      const filterBlob = DuckDBClient.buildFilterString(filters, columns);
      filterString = filterBlob.filterString;
      filterParams = filterBlob.filterParams;
    }

    const selectSQL = `SELECT ${selects.join(", ")}`;
    const baseSQL = `FROM ${DuckDBData.wrapIdentifier(
      schema
    )}.${DuckDBData.wrapIdentifier(table)} ${filterString}`;
    const countSQL = `select count(*) as ${countTitle} ${baseSQL}`;
    const sql = `
      ${selectSQL} ${baseSQL}
      ${orderByString}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ""}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
    `;
    return { query: sql, countQuery: countSQL, params: filterParams };
  }

  // TODO put this somewhere else
  static buildFilterString(
    filters: TableFilter[],
    columns: ExtendedTableColumn[] = []
  ) {
    let filterString = "";
    let filterParams = [];
    if (filters && _.isArray(filters) && filters.length > 0) {
      const allFilters = filters.map((item) => {
        const column = columns.find((c) => c.columnName === item.field);
        const field = column?.dataType.match(/blob|bytea|binary/)
          ? `HEX(${DuckDBData.wrapIdentifier(item.field)})`
          : DuckDBData.wrapIdentifier(item.field);

        if (item.type === "in") {
          const questionMarks = _.isArray(item.value)
            ? item.value.map(() => "?").join(",")
            : "?";

          return `${field} ${item.type.toUpperCase()} (${questionMarks})`;
        }

        if (item.type.includes("is")) {
          return `${field} ${item.type.toUpperCase()} NULL`;
        }

        return `${field} ${item.type.toUpperCase()} ?`;
      });
      filterString = "WHERE " + joinFilters(allFilters, filters);

      filterParams = filters
        .filter((item) => item.value)
        .flatMap((item) => {
          return _.isArray(item.value) ? item.value : [item.value];
        });
    }
    return {
      filterString,
      filterParams,
    };
  }

  // disconnect(): Promise<void> {
  //   // SQLite does not have connection poll. So we open and close connections
  //   // for every query request. This allows multiple request at same time by
  //   // using a different thread for each connection.
  //   // This may cause connection limit problem. So we may have to change this at some point.
  //   return Promise.resolve();
  // }

  wrapIdentifier(value: string): string {
    return DuckDBData.wrapIdentifier(value);
  }
}
