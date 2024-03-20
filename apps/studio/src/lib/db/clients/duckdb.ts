// @ts-nocheck
import { TableKey } from "@shared/lib/dialects/models";
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
  buildSelectTopQuery,
  applyChangesSql,
} from "./utils";
import knexlib from "knex";
import _ from "lodash";
import rawLog from "electron-log";
import { DuckDBClient as DuckDBKnexClient } from "@shared/lib/knex-duckdb";
import Client from "knex/lib/client";
import {
  Database,
  Connection,
  Statement,
  OPEN_READONLY,
  OPEN_READWRITE,
} from "duckdb-async";
import { identify } from "sql-query-identifier";
import {
  CancelableQuery,
  DatabaseFilterOptions,
  ExtendedTableColumn,
  FilterOptions,
  OrderBy,
  PrimaryKeyColumn,
  StreamResults,
  TableFilter,
  TableIndex,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger,
} from "@/lib/db/models";
import { fileExists, joinFilters } from "@/common/utils";
import { DuckDBCursor } from "./duckdb/DuckDBCursor";
import { ColumnInfo, TableData } from "duckdb";
import { IdentifyResult } from "sql-query-identifier/lib/defines";

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

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, duckDBContext, server, database);

    this.dialect = "generic"; // TODO try 'duckdb'
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.databasePath = database?.database;
  }

  versionString(): string {
    return this.version;
  }

  async connect(): Promise<void> {
    await super.connect();

    // FIXME check readonly
    // readOnly: this.readOnlyMode ? OPEN_READONLY : OPEN_READWRITE,
    this.databaseInstance = await Database.create(this.databasePath);

    this.knex = knexlib({
      client: DuckDBKnexClient as Client,
      connection: {
        databaseInstance: this.databaseInstance.get_ddb_internal(),
        // filename: this.databasePath,
      },
    });

    const result = await this.driverExecuteSingle("SELECT version()");

    this.version = result.data[0]["version()"];
  }

  query(queryText: string, options?: any): CancelableQuery {
    let connection: Connection;

    return {
      execute: async () => {
        try {
          connection = await this.databaseInstance.connect();
          return await this.executeQuery(queryText, { connection });
        } finally {
          connection?.close();
        }
      },
      cancel: async () => {
        // TODO test this
        await connection?.close();
      },
    };
  }

  async executeQuery(
    queryText: string,
    options?: any
  ): Promise<NgQueryResult[]> {
    const usingInternalConnection = !options?.connection;
    const connection: Connection = usingInternalConnection
      ? await this.databaseInstance.connect()
      : options.connection;

    const results = await this.driverExecuteMultiple(queryText, {
      connection: connection,
    });

    if (usingInternalConnection) {
      connection.close();
    }

    return results.map(({ data, columns, statement }) => {
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
    // description?: string
    // size?: number
    // indexSize?: number
    // indexes: TableIndex[]
    // relations: TableKey[]
    // triggers: TableTrigger[]
    // partitions?: TablePartition[]
    // owner?: string,
    // createdAt?: string
    //

    // select * from duckdb_tables where table_name
    //     database_name
    // database_oid
    // schema_name
    // schema_oid
    // table_name
    // table_otd
    // comnent
    // internal
    // temporary
    // has_prünary_key
    // estimated_stze
    // column_count
    // index_count
    // check_constraint_count
    // sql

    const result = await this.driverExecuteSingle(
      `
        SELECT
          comment,
          estimated_size
        FROM duckdb_tables
        WHERE schema_name = ?
          AND table_name = ?
      `,
      { params: [schema, table] }
    );

    // const result = await this.driverExecuteSingle(
    //   `
    //     SELECT
    //       comment,
    //       estimated_size
    //     FROM duckdb_tables
    //     WHERE schema_name = ${this.wrapLiteral(schema)}
    //       AND table_name = ${this.wrapLiteral(table)}
    //   `
    // );

    const data = result.data[0];
    const indexes = this.listTableIndexes(table, schema);
    const triggers = this.listTableTriggers(table, schema);

    return {
      description: data.comment,
      size: data.estimated_size,
      // TODO below
      // indexSize: 0,
      indexes: await indexes,
      // relations: [],
      triggers: await triggers,
      // owner: "",
      // createdAt: "",
    };
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const { data } = await this.driverExecuteSingle("SHOW");
    const tables = data.map((row: any) => ({
      schema: row.schema,
      name: row.name,
      entityType: "table",
    }));
    return tables;
  }

  async listTableColumns(
    table?: string,
    schema?: string
  ): Promise<ExtendedTableColumn[]> {
    const params: [string, string][] = [];
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
      params.push(["table_name", table]);
    }

    if (schema) {
      params.push(["schema_name", schema]);
    }

    if (params.length > 0) {
      const conditions = params
        .map(([column, value]) => `${column} = ${this.wrapLiteral(value)}`)
        .join(" AND ");
      query += ` WHERE ${conditions}`;
    }

    const { data } = await this.driverExecuteSingle(query);
    return data.map(
      (row: any): ExtendedTableColumn => ({
        schemaName: row.schema_name,
        tableName: row.table_name,
        columnName: row.column_name,
        ordinalPosition: row.column_index,
        dataType: row.data_type,
        nullable: row.is_nullable,
        defaultValue: row.column_default,
        comment: row.comment,
      })
    );
  }

  async listTableTriggers(
    table: string,
    schema?: string
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

  protected async rawExecuteQuery(
    q: string,
    options: any
  ): Promise<DuckDBResult | DuckDBResult[]> {
    const queries = this.identifyCommands(q);
    const params = options.params;
    const arrayMode = options.arrayMode;
    const results = [];
    const mustCloseConnection = !options.connection;
    const conn: Connection = options.connection
      ? options.connection
      : await this.databaseInstance.connect();

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
      } finally {
        if (mustCloseConnection) {
          await conn.close();
        }
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
      WHERE schema_name = ${this.wrapLiteral(schema)}
        AND table_name = ${this.wrapLiteral(table)}
        AND constraint_type = 'PRIMARY KEY'
    `;

    const { data } = await this.driverExecuteSingle(sql);

    data.forEach((row: any) => {
      row.constraint_column_names.forEach((name, idx) => {
        keys.push({
          columnName: name,
          position: Number(row.constraint_column_indexes[idx]),
        });
      });
    });

    return keys;
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

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema: string
  ): Promise<void> {
    let query: string;

    if (typeOfElement === "TABLE") {
      query = "DROP TABLE";
    } else if (
      typeOfElement === "VIEW" ||
      typeOfElement === "MATERIALIZED-VIEW"
    ) {
      query = "DROP VIEW";
    } else {
      throw new Error(`Dropping ${typeOfElement} is not supported.`);
    }

    elementName = DuckDBClient.wrapIdentifier(elementName);
    schema = DuckDBClient.wrapIdentifier(schema);

    await this.driverExecuteSingle(`${query} ${schema}.${elementName}`);
  }

  async truncateElement(
    elementName: string,
    _typeOfElement: DatabaseElement,
    schema: string
  ): Promise<void> {
    const query = `TRUNCATE ${DuckDBClient.wrapIdentifier(
      schema
    )}.${DuckDBClient.wrapIdentifier(elementName)}`;
    await this.driverExecuteSingle(query);
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
    schema?: string
  ): Promise<StreamResults> {
    const columns = await this.listTableColumns(table);
    const totalRows = await this.getTableLength(table);
    const options = { schema, table, orderBy, filters, chunkSize };
    const cursor = new DuckDBCursor(this, options, chunkSize);
    return { totalRows, columns, cursor };
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    const { countQuery, params } = DuckDBClient.buildSelectTopQuery(table);
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

  async duplicateTableSql(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): string {
    tableName = DuckDBClient.wrapIdentifier(tableName);
    duplicateTableName = DuckDBClient.wrapIdentifier(duplicateTableName);
    schema = DuckDBClient.wrapIdentifier(schema);

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
    countTitle = "total",
    columns: ExtendedTableColumn[] = [],
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
              return `${this.wrapIdentifier(item["field"])} ${item[
                "dir"
              ].toUpperCase()}`;
            } else {
              return this.wrapIdentifier(item);
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

    const selectSQL = `SELECT ${selects
      .map((s) => this.wrapIdentifier(s))
      .join(", ")}`;
    const baseSQL = `FROM ${this.wrapIdentifier(table)} ${filterString}`;
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
        const field = column?.dataType.toUpperCase().includes("BINARY")
          ? `HEX(${this.wrapIdentifier(item.field)})`
          : this.wrapIdentifier(item.field);

        if (item.type === "in") {
          const questionMarks = _.isArray(item.value)
            ? item.value.map(() => "?").join(",")
            : "?";

          return `${field} ${item.type.toUpperCase()} (${questionMarks})`;
        }
        return `${field} ${item.type.toUpperCase()} ?`;
      });
      filterString = "WHERE " + joinFilters(allFilters, filters);

      filterParams = filters.flatMap((item) => {
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

  private identifyCommands(queryText: string) {
    try {
      return identify(queryText);
    } catch (err) {
      return [];
    }
  }

  // TODO move this to dialectData
  static wrapIdentifier(value: string): string {
    return value !== "*" ? `"${value.replaceAll(/"/g, '""')}"` : "*";
  }

  // TODO move this to dialectData
  wrapLiteral(value: string): string {
    return value !== "*" ? `'${value.replaceAll(/'/g, "''")}'` : "*";
  }
}
