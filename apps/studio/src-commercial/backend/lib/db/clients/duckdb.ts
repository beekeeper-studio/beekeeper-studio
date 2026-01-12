import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "@/lib/db/clients/BasicDatabaseClient";
import {
  buildInsertQueries,
  buildDeleteQueries,
  buildSchemaFilter,
} from "@/lib/db/clients/utils";
import knexlib, { Knex } from "knex";
import _ from "lodash";
import rawLog from "@bksLogger";
import { Client_DuckDB as DuckDBKnexClient } from "@shared/lib/knex-duckdb";
import { DuckDBInstance as Database, DuckDBConnection as Connection, DuckDBMaterializedResult, DuckDBType, DuckDBValue, DuckDBListValue, DuckDBTypeId, DuckDBBlobValue, DuckDBBlobType } from "@duckdb/node-api";
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
  BksField,
  BksFieldType,
  DatabaseEntity,
} from "@/lib/db/models";
import { joinFilters } from "@/common/utils";
import { DuckDBCursor } from "./duckdb/DuckDBCursor";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { DuckDBChangeBuilder } from "@shared/lib/sql/change_builder/DuckDBChangeBuilder";
import { DuckDBData } from "@shared/lib/dialects/duckdb";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { TableKey } from "@shared/lib/dialects/models";
import { DuckDBBinaryTranscoder } from "@/lib/db/serialization/transcoders";

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


type RowObject = Record<string, DuckDBValue>;
type RowArray = DuckDBValue[];

interface DuckDBResultBase {
  columns: { name: string; type: DuckDBType }[];
  statement: IdentifyResult;
  rowCount: number;
  rowsChanged: number;
}

interface DuckDBResultObjectData extends DuckDBResultBase {
  arrayMode: false;
  rows: RowObject[];
}

interface DuckDBResultArrayData extends DuckDBResultBase {
  arrayMode: true;
  rows: RowArray[];
}

type DuckDBResult<Mode = "object"> = Mode extends "array" ? DuckDBResultArrayData : DuckDBResultObjectData;

function buildFilterString(
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

function buildSelectTopQuery(
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
    const filterBlob = buildFilterString(filters, columns);
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

export class DuckDBClient extends BasicDatabaseClient<DuckDBResult> {
  version: string;
  databasePath: string;
  databaseInstance: Database;
  // We only use one connection to be able to read and write at the same time
  // https://duckdb.org/docs/connect/concurrency#handling-concurrency
  connectionInstance: Connection;
  transcoders = [DuckDBBinaryTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, duckDBContext, server, database);

    this.dialect = "generic";
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.databasePath = database?.database;
    this.createUpsertFunc = this.createUpsertSQL;
  }

  getBuilder(table: string, schema: string): ChangeBuilderBase {
    return new DuckDBChangeBuilder(table, schema);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
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
      transactions: false,
      filterTypes: ['standard']
    };
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async connect(): Promise<void> {
    await super.connect();

    this.databaseInstance = await Database.create(
      this.databasePath || ":memory:",
      {
        access_mode: this.readOnlyMode ? "READ_ONLY" : "READ_WRITE",
      }
    );
    this.connectionInstance = await this.databaseInstance.connect();

    this.knex = knexlib({
      client: DuckDBKnexClient as unknown as typeof Knex.Client,
      connection: {
        // @ts-expect-error
        connectionInstance: this.connectionInstance,
      },
    });

    const result = await this.driverExecuteSingle("SELECT version() as version");

    this.version = result.rows[0]["version"] as string;
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    this.connectionInstance.closeSync();
    this.databaseInstance.closeSync();
  }

  async query(queryText: string, options?: any): Promise<CancelableQuery> {
    return {
      execute: async () => {
        return await this.executeQuery(queryText, { arrayMode: true, ...options });
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

    return results.map((result) => {
      const fields = result.columns.map((column, idx) => ({
        id: `c${idx}`,
        name: column.type.alias || column.name,
        type: column.type.toString(),
      }));

      const rows = result.rows.map((row: typeof result.rows[number]) => {
        const obj = {};
        fields.forEach((field, i) => {
          obj[field.id] = row[result.arrayMode ? i : field.name];
        });
        return obj;
      });

      return { fields, rows, rowCount: result.rowCount };
    });
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const { rows } = await this.driverExecuteSingle(`
      SELECT database_name FROM duckdb_databases
    `);
    return rows.map((row) => row.database_name as string);
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

    const data = result.rows[0];
    const indexes = this.listTableIndexes(table, schema);
    const triggers = this.listTableTriggers(table, schema);

    return {
      description: data.comment as string,
      size: Number(data.estimated_size),
      indexSize: Number(data.index_count),
      indexes: await indexes,
      relations: [],
      triggers: await triggers,
      owner: "",
      createdAt: "",
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema: string): Promise<string> {
    schema = DuckDBData.wrapLiteral(schema);
    table = DuckDBData.wrapIdentifier(table);
    return `SELECT * FROM ${schema}.${table} LIMIT ${limit}`;
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    let query = "SELECT table_name, schema_name FROM duckdb_tables";
    const options = { params: [] };
    if (filter?.schema) {
      query += ` WHERE schema_name = ?`;
      options.params = [filter.schema];
    }
    const { rows } = await this.driverExecuteSingle(query, options);
    const tables: TableOrView[] = rows.map((row) => ({
      schema: row.schema_name as string,
      name: row.table_name as string,
      entityType: "table",
    }));
    return tables;
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    let query = "SELECT view_name, schema_name FROM duckdb_views";
    const options = { params: [] };
    if (filter?.schema) {
      query += ` WHERE schema_name = ?`;
      options.params = [filter.schema];
    }
    const { rows } = await this.driverExecuteSingle(query, options);
    const views: TableOrView[] = rows.map((row) => ({
      schema: row.schema_name as string,
      name: row.view_name as string,
      entityType: "view",
    }));
    return views;
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
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
      const conditions = params.map((p) => `${p.column} = ?`).join(" AND ");
      query += ` WHERE ${conditions}`;
    }

    const { rows } = await this.driverExecuteSingle(query, {
      params: [...params.map((p) => p.value)],
    });
    return rows.map(
      (row): ExtendedTableColumn => ({
        schemaName: row.schema_name as string,
        tableName: row.table_name as string,
        columnName: row.column_name as string,
        ordinalPosition: row.column_index as number,
        dataType: row.data_type as string,
        nullable: row.is_nullable as boolean,
        defaultValue: row.column_default as string,
        hasDefault: !_.isNil(row.column_default),
        comment: row.comment as string,
        bksField: this.parseTableColumn({
          name: row.column_name as string,
          type: row.data_type as string,
        }),
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
    const { rows } = await this.driverExecuteSingle(
      `
        SELECT
          schema_name,
          table_name,
          index_name,
          index_oid,
          comment,
          is_unique,
          is_primary,
          sql
        FROM duckdb_indexes
        WHERE table_name = ?
          AND schema_name = ?
      `,
      { params: [table, schema || await this.defaultSchema()] }
    );

    return rows.map((row) => ({
      id: row.index_oid as string,
      table: row.table_name as string,
      schema: row.schema_name as string,
      name: row.index_name as string,
      columns: this.parseColumnsFromIndexSql(row.sql as string).map((name) => ({ name })),
      unique: row.is_unique as boolean,
      primary: row.is_primary as boolean,
    }));
  }

  private parseColumnsFromIndexSql(sql: string): string[] {
    // See https://duckdb.org/docs/sql/statements/create_index#syntax
    sql = sql.trim();

    // Extract first set of parentheses
    const stack = [];
    let startIndex = -1;
    let content = "";
    for (let i = 0; i < sql.length; i++) {
      if (sql[i] === "(") {
        if (stack.length === 0) {
          startIndex = i + 1;
        }
        stack.push("(");
      } else if (sql[i] === ")") {
        stack.pop();
        if (stack.length === 0) {
          content = sql.substring(startIndex, i);
          break;
        }
      }
    }

    const columns = content.split(",").map((c) => c.trim());
    return columns;
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const filterQuery = buildSchemaFilter(filter);
    const { rows } = await this.driverExecuteSingle(`
      SELECT DISTINCT schema_name
      FROM information_schema.schemata
      ${filterQuery ? "WHERE " + filterQuery : ""}
    `);
    return rows.map((row) => row.schema_name as string);
  }

  async getTableReferences(table: string, schema: string): Promise<string[]> {
    const { rows } = await this.driverExecuteSingle(`
      WITH cte AS (
        SELECT rc.unique_constraint_name AS unique_constraint_name
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON rc.constraint_name = kcu.constraint_name
        JOIN information_schema.table_constraints tc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = ?
          AND tc.table_name = ?
      )
      SELECT kc.table_name
      FROM cte
      JOIN information_schema.key_column_usage kc
        ON cte.unique_constraint_name = kc.constraint_name
    `, { params: [schema || await this.defaultSchema(), table] });
    return rows.map((row) => row.table_name as string);
  }

  async getOutgoingKeys(table: string, schema?: string): Promise<TableKey[]> {
    const defaultSchema = schema || await this.defaultSchema();

    // Query to get outgoing foreign keys (from this table to other tables)
    const { rows } = await this.driverExecuteSingle(
      `
      SELECT
        kcu1.constraint_schema AS from_schema,
        kcu1.table_name AS from_table,
        kcu1.column_name AS from_column,
        kcu1.constraint_name,
        rc.update_rule,
        rc.delete_rule,
        kcu2.constraint_schema AS to_schema,
        kcu2.table_name AS to_table,
        kcu2.column_name AS to_column
      FROM
        information_schema.key_column_usage AS kcu1
      JOIN
        information_schema.referential_constraints AS rc
      ON
        kcu1.constraint_name = rc.constraint_name
        AND kcu1.constraint_schema = rc.constraint_schema
      JOIN
        information_schema.key_column_usage AS kcu2
      ON
        kcu2.constraint_name = rc.unique_constraint_name
        AND kcu2.constraint_schema = rc.unique_constraint_schema
        AND kcu2.ordinal_position = kcu1.ordinal_position
      WHERE
        kcu1.table_schema = ?
        AND kcu1.table_name = ?
        AND rc.constraint_name = kcu1.constraint_name
      ORDER BY from_schema, from_table, kcu1.constraint_name, from_column
    `,
      { params: [defaultSchema, table] }
    );

    return this.groupTableKeys(rows);
  }

  async getIncomingKeys(table: string, schema?: string): Promise<TableKey[]> {
    const defaultSchema = schema || await this.defaultSchema();

    // Query to get incoming foreign keys (from other tables to this table)
    const { rows } = await this.driverExecuteSingle(
      `
      SELECT
        kcu1.constraint_schema AS from_schema,
        kcu1.table_name AS from_table,
        kcu1.column_name AS from_column,
        kcu1.constraint_name,
        rc.update_rule,
        rc.delete_rule,
        kcu2.constraint_schema AS to_schema,
        kcu2.table_name AS to_table,
        kcu2.column_name AS to_column
      FROM
        information_schema.key_column_usage AS kcu1
      JOIN
        information_schema.referential_constraints AS rc
      ON
        kcu1.constraint_name = rc.constraint_name
        AND kcu1.constraint_schema = rc.constraint_schema
      JOIN
        information_schema.key_column_usage AS kcu2
      ON
        kcu2.constraint_name = rc.unique_constraint_name
        AND kcu2.constraint_schema = rc.unique_constraint_schema
        AND kcu2.ordinal_position = kcu1.ordinal_position
      WHERE
        kcu2.table_schema = ?
        AND kcu2.table_name = ?
        AND rc.constraint_name = kcu1.constraint_name
      ORDER BY from_schema, from_table, kcu1.constraint_name, from_column
    `,
      { params: [defaultSchema, table] }
    );

    return this.groupTableKeys(rows);
  }

  private groupTableKeys(rows: any[]): TableKey[] {
    // Group by constraint_name to handle composite keys
    const groupedKeys = new Map<string, TableKey>();

    for (const row of rows) {
      const key = row.constraint_name as string;

      if (!groupedKeys.has(key)) {
        groupedKeys.set(key, {
          toTable: row.to_table as string,
          toSchema: row.to_schema as string,
          toColumn: row.to_column as string,
          fromTable: row.from_table as string,
          fromSchema: row.from_schema as string,
          fromColumn: row.from_column as string,
          constraintName: row.constraint_name as string,
          onUpdate: row.update_rule as string,
          onDelete: row.delete_rule as string,
          isComposite: false,
        });
      } else {
        // This is a composite key
        const existing = groupedKeys.get(key);
        existing.isComposite = true;

        // Convert to arrays if not already
        if (!Array.isArray(existing.fromColumn)) {
          existing.fromColumn = [existing.fromColumn];
          existing.toColumn = [existing.toColumn];
        }

        (existing.fromColumn as string[]).push(row.from_column as string);
        (existing.toColumn as string[]).push(row.to_column as string);
      }
    }

    return Array.from(groupedKeys.values());
  }

  async defaultSchema(): Promise<string> {
    return "main";
  }

  protected async rawExecuteQuery(
    q: string,
    options: any
  ): Promise<DuckDBResult | DuckDBResult[]> {
    const queries = identify(q, { strict: false });
    const params = options.params;
    const results: DuckDBResult[] = [];
    const conn: Connection = options.connection || this.connectionInstance;
    const arrayMode = options.arrayMode;

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      try {
        const statement = await conn.prepare(query.text);
        let result: DuckDBMaterializedResult;

        if (params) {
          const { values, types } = this.buildStatementBindArgs(params)
          statement.bind(values, types);
        }
        result = await statement.run();

        const columnNames = result.columnNames();
        const columnTypes = result.columnTypes();
        const columns = columnNames.map((name, idx) => ({
          name,
          type: columnTypes[idx],
        }))
        const rows = arrayMode ? await result.getRows() : await result.getRowObjects();

        results.push({
          rows,
          columns,
          statement: query,
          arrayMode,
          rowCount: result.rowCount,
          rowsChanged: result.rowsChanged,
        } as DuckDBResult);
      } catch (error) {
        log.error(error);
        throw error;
      }
    }

    return options.multiple ? results : results[0];
  }

  private buildStatementBindArgs(params) {
    const values = [];
    const types = {};
    params.forEach((param, idx) => {
      if (_.isBuffer(param) || _.isTypedArray(param)) {
        values.push(new DuckDBBlobValue(param))
        types[idx] = DuckDBBlobType.instance
      } else {
        values.push(param)
      }
    })
    return { values, types }
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

    const { rows } = await this.driverExecuteSingle(sql, {
      params: [schema, table],
    });

    rows.forEach((row) => {
      const columnNames = row.constraint_column_names as DuckDBListValue;
      const columnPositions = row.constraint_column_indexes as DuckDBListValue;
      columnNames.items.forEach((name, idx) => {
        keys.push({
          columnName: name as string,
          position: columnPositions[idx],
        });
      });
    });

    return keys;
  }

  async listCollations(): Promise<string[]> {
    const result = await this.driverExecuteSingle("PRAGMA collations");
    return result.rows.map((row) => row.collname as string);
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
  ): Promise<string> {
    databaseName = databaseName.trimEnd();
    if (!databaseName.endsWith(".duckdb")) {
      databaseName += ".duckdb";
    }
    await Database.create(databaseName);
    return databaseName;
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getTableCreateScript(table: string, schema: string): Promise<string> {
    const { rows } = await this.driverExecuteSingle(
      `
        SELECT sql
        FROM duckdb_tables
        WHERE table_name = ?
        AND schema_name = ?
      `,
      { params: [table, schema] }
    );
    return rows[0].sql as string;
  }

  async getViewCreateScript(view: string, schema: string): Promise<string[]> {
    const { rows } = await this.driverExecuteSingle(
      `
        SELECT sql
        FROM duckdb_views
        WHERE view_name = ?
        AND schema_name = ?
      `,
      { params: [view, schema] }
    );
    return rows.map((row) => row.sql as string);
  }

  async getRoutineCreateScript(
    _routine: string,
    _type: string,
    _schema: string
  ): Promise<string[]> {
    return [];
  }

  async executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
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

  async setElementNameSql(
    elementName: string,
    newElementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): Promise<string> {
    if (
      typeOfElement === DatabaseElement.TABLE ||
      typeOfElement === DatabaseElement.VIEW ||
      typeOfElement === DatabaseElement.SCHEMA
    ) {
      elementName = schema
        ? `${DuckDBData.wrapIdentifier(schema)}.${DuckDBData.wrapIdentifier(
          elementName
        )}`
        : DuckDBData.wrapIdentifier(elementName);
      newElementName = DuckDBData.wrapIdentifier(newElementName);

      return `ALTER ${typeOfElement} ${elementName} RENAME TO ${newElementName}`;
    }

    return "";
  }

  async truncateElementSql(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): Promise<string> {
    if (typeOfElement === DatabaseElement.TABLE) {
      return schema
        ? `TRUNCATE ${DuckDBData.wrapIdentifier(
          schema
        )}.${DuckDBData.wrapIdentifier(elementName)}`
        : `TRUNCATE ${DuckDBData.wrapIdentifier(elementName)}`;
    }
    return "";
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
      if (r.rows[0]) results.push(r.rows[0]);
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
    const fields = this.parseQueryResultColumns(result);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  protected parseQueryResultColumns(qr: DuckDBResult): BksField[] {
    return qr.columns.map((c) => ({
      name: c.name,
      bksType: c.type.typeId === DuckDBTypeId.BLOB ? "BINARY" : "UNKNOWN",
    }));
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
    const { query, params } = buildSelectTopQuery(
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
    const { countQuery, params } = buildSelectTopQuery(
      table,
      undefined,
      undefined,
      undefined,
      undefined,
      schema
    );
    const countResults = await this.driverExecuteSingle(countQuery, { params });
    const rowWithTotal = countResults.rows.find((row) => {
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
    const query = await this.duplicateTableSql(tableName, duplicateTableName, schema);
    await this.driverExecuteSingle(query);
  }

  // took this approach because Typescript wasn't liking the base function could be a null value or a function
  createUpsertSQL({ name: tableName }: DatabaseEntity, data: {[key: string]: any}[]): string {
    const [firstObj] = data
    const columns = Object.keys(firstObj)
    const values = data.map(d => `(${columns.map(c => `'${d[c]}'`).join()})`).join()
    return `INSERT OR REPLACE \`${tableName}\`, (${columns.map(cpk => `\`${cpk}\``).join(', ')}) VALUES ${values}`.trim()
  }

  async duplicateTableSql(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): Promise<string> {
    tableName = DuckDBData.wrapIdentifier(tableName);
    duplicateTableName = DuckDBData.wrapIdentifier(duplicateTableName);
    schema = DuckDBData.wrapIdentifier(schema);

    return `
      CREATE TABLE ${schema}.${duplicateTableName}
      AS SELECT * FROM ${schema}.${tableName}
    `;
  }

  protected parseTableColumn(column: { name: string, type: string }): BksField {
    let bksType: BksFieldType = "UNKNOWN";
    if (column.type === "BLOB") {
      bksType = "BINARY";
    }
    return { name: column.name, bksType };
  }

  wrapIdentifier(value: string): string {
    return DuckDBData.wrapIdentifier(value);
  }
}
