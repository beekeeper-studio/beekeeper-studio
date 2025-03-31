import rawLog from "@bksLogger";
import { DatabaseElement, IDbConnectionDatabase, IDbConnectionServer } from "@/lib/db/types";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "@/lib/db/clients/BasicDatabaseClient";
import { TrinoKnexClient } from "@shared/lib/knex-trino";
import knexlib from "knex";
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
  TableKey,
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
  joinFilters
} from "@/common/utils";
import {
  AlterTableSpec,
  IndexColumn,
} from "@shared/lib/dialects/models";
import { errors } from "@/lib/errors";
import { uuidv4 } from "@/lib/uuid";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import fetch from 'node-fetch';

interface QueryResult {
  columns: { name: string, type: string }[];
  data: any[][];
  success: boolean;
  message?: string;
}

const log = rawLog.scope("trino");

const trinoContext = {
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

export class TrinoClient extends BasicDatabaseClient<QueryResult> {
  version: string;
  client: any; // Trino client
  baseUrl: string;
  headers: Record<string, string>;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    // Initialize with a Knex instance that uses our TrinoKnexClient
    super(knexlib({
      client: TrinoKnexClient,
      connection: {
        host: server.config.host,
        port: server.config.port,
        user: server.config.user,
        password: server.config.password,
        catalog: database.connection?.catalog || database.database,
        schema: database.name,
        ssl: server.config.ssl
      }
    }), trinoContext, server, database);

    this.dialect = "trino";
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    
    // Setup URL and headers for direct API calls
    const protocol = server.config.ssl ? "https" : "http";
    this.baseUrl = `${protocol}://${server.config.host}:${server.config.port}/v1`;
    
    this.headers = {
      "X-Trino-User": server.config.user || "trino"
    };
    
    if (server.config.password) {
      this.headers["X-Trino-Password"] = server.config.password;
    }
  }

  async connect(): Promise<void> {
    log.debug("Connecting to Trino server");
    
    try {
      // Test the connection by getting the version information
      const response = await fetch(`${this.baseUrl}/info`, {
        method: "GET",
        headers: this.headers
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to connect: ${error}`);
      }
      
      const info = await response.json();
      this.version = info.nodeVersion || "Unknown";
      log.debug("Connected to Trino server", { version: this.version });
    } catch (err) {
      log.error("Connection failed", err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    log.debug("Disconnecting from Trino server");
    // No specific disconnect needed for REST API connection
    await super.disconnect();
  }

  async versionString(): Promise<string> {
    return `Trino ${this.version}`;
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schema = filter?.schema || this.database.name;
    const catalog = this.database.connection?.catalog || this.database.database;
    
    const query = `
      SELECT table_name, table_schema
      FROM ${catalog}.information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    try {
      const result = await this.executeQuery(query);
      return result[0].rows.map(row => ({
        name: row.c0, // table_name
        schema: row.c1, // table_schema
        entityType: "table"
      }));
    } catch (err) {
      log.error("Error listing tables", err);
      return [];
    }
  }

  async listTableColumns(
    table?: string,
    schema?: string
  ): Promise<ExtendedTableColumn[]> {
    if (!table) return [];
    
    schema = schema || this.database.name;
    const catalog = this.database.connection?.catalog || this.database.database;
    
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM ${catalog}.information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${table}'
      ORDER BY ordinal_position
    `;
    
    try {
      const result = await this.executeQuery(query);
      return result[0].rows.map(row => ({
        columnName: row.c0, // column_name
        dataType: row.c1, // data_type
        nullable: row.c2 === 'YES', // is_nullable
        defaultValue: row.c3, // column_default
        comment: null,
        virtual: false,
        array: false,
        bksField: this.parseTableColumn(row)
      }));
    } catch (err) {
      log.error("Error listing columns", err);
      return [];
    }
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schema = filter?.schema || this.database.name;
    const catalog = this.database.connection?.catalog || this.database.database;
    
    const query = `
      SELECT table_name, table_schema
      FROM ${catalog}.information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_type = 'VIEW'
      ORDER BY table_name
    `;
    
    try {
      const result = await this.executeQuery(query);
      return result[0].rows.map(row => ({
        name: row.c0, // table_name
        schema: row.c1, // table_schema
        entityType: "view"
      }));
    } catch (err) {
      log.error("Error listing views", err);
      return [];
    }
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    // Trino doesn't have a specific materialized view concept like PostgreSQL
    return [];
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    // Trino doesn't have materialized views
    return [];
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    // Trino doesn't support triggers
    return [];
  }

  async listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    // Trino doesn't have traditional indexes like relational databases
    return [];
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const catalog = filter?.database || this.database.connection?.catalog || this.database.database;
    
    const query = `
      SELECT schema_name
      FROM ${catalog}.information_schema.schemata
      ORDER BY schema_name
    `;
    
    try {
      const result = await this.executeQuery(query);
      return result[0].rows.map(row => row.c0); // schema_name
    } catch (err) {
      log.error("Error listing schemas", err);
      return [];
    }
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    // Trino doesn't maintain foreign key relationships
    return [];
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    // Trino doesn't maintain foreign key information
    return [];
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    log.debug("Executing query", { query: queryText });
    
    try {
      const result = await this.rawExecuteQuery(queryText, options || {});
      
      // If no columns or data, it was likely a non-query statement
      if (!result.columns || result.columns.length === 0) {
        return [{
          fields: [],
          affectedRows: 0,
          command: "SUCCESS",
          rows: [],
          rowCount: 0,
          messages: result.message ? [result.message] : [],
          error: null
        }];
      }
      
      // For regular query results
      const fields = result.columns.map((col, idx) => ({
        id: `c${idx}`,
        name: col.name,
        dataType: col.type
      }));
      
      // Transform rows to objects with c0, c1, etc. properties
      const rows = result.data.map(row => 
        row.reduce((acc, val, idx) => ({ ...acc, [`c${idx}`]: val }), {})
      );
      
      return [{
        fields,
        affectedRows: 0,
        command: "SELECT",
        rows,
        rowCount: rows.length,
        messages: [],
        error: null
      }];
    } catch (err) {
      log.error("Error executing query", err);
      
      return [{
        fields: [],
        affectedRows: 0,
        command: "ERROR",
        rows: [],
        rowCount: 0,
        messages: [],
        error: err.message
      }];
    }
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    // In Trino, databases are schemas within a catalog
    return this.listSchemas(filter);
  }

  async getTableProperties(
    table: string,
    schema?: string
  ): Promise<TableProperties> {
    return {
      schema: schema || this.database.name,
      table,
      tableProperties: [],
      columnProperties: []
    };
  }

  async getQuerySelectTop(
    table: string,
    limit: number,
    schema?: string
  ): Promise<string> {
    schema = schema || this.database.name;
    return `SELECT * FROM "${schema}"."${table}" LIMIT ${limit}`;
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string> {
    // Trino doesn't expose primary key information through information_schema
    return '';
  }

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    // Trino doesn't expose primary key information through information_schema
    return [];
  }

  async listCharsets(): Promise<string[]> {
    return ["UTF8"];
  }

  async getDefaultCharset(): Promise<string> {
    return "UTF8";
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    schema = schema || this.database.name;
    
    try {
      const result = await this.executeQuery(`SELECT count(*) FROM "${schema}"."${table}"`);
      return Number(result[0].rows[0].c0);
    } catch (err) {
      log.error("Error getting table length", err);
      return 0;
    }
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ): Promise<TableResult> {
    schema = schema || this.database.name;
    
    try {
      const sql = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
      const queryResult = await this.executeQuery(sql);
      
      return {
        result: queryResult[0].rows,
        fields: queryResult[0].fields,
        totalRows: await this.getTableLength(table, schema)
      };
    } catch (err) {
      log.error("Error in selectTop", err);
      throw err;
    }
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ): Promise<string> {
    schema = schema || this.database.name;
    
    const selectClause = selects && selects.length 
      ? selects.map(s => TrinoData.wrapIdentifier(s)).join(', ') 
      : '*';
    
    let sql = `SELECT ${selectClause} FROM "${schema}"."${table}"`;
    
    // Add WHERE clause
    if (typeof filters === 'string' && filters.trim()) {
      sql += ` WHERE ${filters}`;
    } else if (Array.isArray(filters) && filters.length > 0) {
      const filterClauses = filters.map(f => {
        const field = TrinoData.wrapIdentifier(f.field);
        
        if (f.type === 'is null' || f.type === 'is not null') {
          return `${field} ${f.type.toUpperCase()}`;
        } else if (f.type === 'in') {
          const values = Array.isArray(f.value) 
            ? f.value.map(v => TrinoData.escapeString(v, true)).join(', ')
            : TrinoData.escapeString(f.value, true);
          return `${field} IN (${values})`;
        } else {
          return `${field} ${f.type.toUpperCase()} ${TrinoData.escapeString(f.value, true)}`;
        }
      });
      
      sql += ` WHERE ${joinFilters(filterClauses, filters)}`;
    }
    
    // Add ORDER BY clause
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(ord => 
        `${TrinoData.wrapIdentifier(ord.field)} ${ord.dir}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // Add LIMIT and OFFSET
    sql += ` LIMIT ${limit}`;
    if (offset > 0) {
      sql += ` OFFSET ${offset}`;
    }
    
    return sql;
  }

  async selectTopStream(
    _table: string,
    _orderBy: OrderBy[],
    _filters: string | TableFilter[],
    _chunkSize: number,
    _schema?: string
  ): Promise<StreamResults> {
    throw new Error("Streaming is not implemented for Trino client");
  }

  async queryStream(
    _query: string,
    _chunkSize: number
  ): Promise<StreamResults> {
    throw new Error("Streaming is not implemented for Trino client");
  }

  async query(queryText: string): Promise<CancelableQuery> {
    let queryId = uuidv4();
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);
    
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText, { queryId })
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
        // Try to cancel the query if we have a queryId
        if (queryId) {
          try {
            await fetch(`${this.baseUrl}/query/${queryId}`, {
              method: "DELETE",
              headers: this.headers
            });
          } catch (err) {
            log.error("Error canceling query", err);
          }
        }
        cancelable.cancel();
      }
    };
  }

  async alterTable(_change: AlterTableSpec): Promise<void> {
    throw new Error("Altering tables is not fully supported in Trino");
  }

  async alterTableSql(_change: AlterTableSpec): Promise<string> {
    throw new Error("Altering tables is not fully supported in Trino");
  }

  async getBuilder(
    _table: string,
    _schema?: string
  ): Promise<ChangeBuilderBase> {
    throw new Error("Change builder is not implemented for Trino");
  }

  async executeApplyChanges(_changes: TableChanges): Promise<any[]> {
    throw new Error("Apply changes is not implemented for Trino");
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
      transactions: false
    };
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    // Trino doesn't have stored procedures or functions
    return [];
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    schema = schema || this.database.name;
    return `-- Trino doesn't provide a way to get the CREATE TABLE script\n-- Table: ${schema}.${table}`;
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    schema = schema || this.database.name;
    return [`-- Trino doesn't provide a way to get the CREATE VIEW script\n-- View: ${schema}.${view}`];
  }

  async getRoutineCreateScript(
    _routine: string,
    _type: string,
    _schema?: string
  ): Promise<string[]> {
    return [];
  }

  async createDatabase(
    _databaseName: string,
    _charset: string,
    _collation: string
  ): Promise<string> {
    throw new Error("Creating databases is not supported in Trino");
  }

  async dropElement(
    _elementName: string,
    _typeOfElement: DatabaseElement,
    _schema?: string
  ): Promise<void> {
    throw new Error("Drop element is not implemented for Trino");
  }

  async setElementNameSql(
    _elementName: string,
    _newElementName: string,
    _typeOfElement: DatabaseElement
  ): Promise<string> {
    throw new Error("Set element name is not implemented for Trino");
  }

  async truncateElementSql(
    _elementName: string,
    _typeOfElement: DatabaseElement
  ): Promise<string> {
    throw new Error("Truncate element is not implemented for Trino");
  }

  async duplicateTable(
    _tableName: string,
    _duplicateTableName: string,
    _schema?: string
  ): Promise<void> {
    throw new Error("Duplicate table is not implemented for Trino");
  }

  async duplicateTableSql(
    _tableName: string,
    _duplicateTableName: string,
    _schema?: string
  ): Promise<string> {
    throw new Error("Duplicate table SQL is not implemented for Trino");
  }

  wrapIdentifier(value: string): string {
    return TrinoData.wrapIdentifier(value);
  }

  protected async rawExecuteQuery(
    query: string,
    _options: any
  ): Promise<QueryResult> {
    // Use fetch to directly call Trino API
    try {
      const catalog = this.database.connection?.catalog || this.database.database;
      const schema = this.database.name;
      
      const response = await fetch(`${this.baseUrl}/statement`, {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query,
          catalog,
          schema
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Query failed: ${error}`);
      }
      
      const data = await response.json();
      
      // Handle response format
      if (data.error) {
        throw new Error(data.error.message || "Query failed");
      }
      
      // Handle successful query results
      if (data.columns && data.data) {
        return {
          columns: data.columns,
          data: data.data,
          success: true
        };
      }
      
      // If we got here, it was probably a non-query statement (INSERT, UPDATE, etc.)
      return {
        columns: [],
        data: [],
        success: true,
        message: "Query executed successfully"
      };
    } catch (err) {
      log.error("Error executing raw query", { error: err.message, query });
      throw err;
    }
  }

  parseTableColumn(column: any): BksField {
    return {
      name: column.c0 || column.columnName || column.name,
      bksType: "UNKNOWN"
    };
  }
}