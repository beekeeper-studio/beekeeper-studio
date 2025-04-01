// Trino client implementation
import _ from 'lodash';
import logRaw from '@bksLogger';
import knexlib from 'knex';
import { IDbConnectionDatabase, IDbConnectionServer } from '../backendTypes';
import { BaseV1DatabaseClient } from './BaseV1DatabaseClient';
import { AppContextProvider, NoOpContextProvider } from './BasicDatabaseClient';
import { SupportedFeatures, FilterOptions, TableOrView, Routine, SchemaFilterOptions, DatabaseFilterOptions, TableKey, DatabaseElement, TableInsert, TableUpdateResult, TableResult, TableFilter, OrderBy, StreamResults, TableColumn, TableTrigger, ExtendedTableColumn, PrimaryKeyColumn, TableIndex, TableProperties, TablePartition, BksField, NgQueryResult } from '../models';
import { RequestInfo, RequestInit, Response } from 'node-fetch';
import { TrinoKnexClient } from '../../shared/lib/knex-trino/index';
import { TrinoCursor } from './trino/TrinoCursor';
import { 
  generateCountQuery, 
  generateListCatalogsQuery, 
  generateListColumnsQuery, 
  generateListSchemasQuery, 
  generateListTablesQuery, 
  generateListViewsQuery, 
  generateSelectTopSql, 
  generateVersionQuery 
} from './trino/scripts';

const log = logRaw.scope('trino');

// QueryResult type for Trino
export interface TrinoQueryResult {
  columns: { name: string, type?: string }[];
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
  queryType?: string;
}

// Define a minimal Trino context
const trinoContext: AppContextProvider = NoOpContextProvider;

export class TrinoClient extends BaseV1DatabaseClient<TrinoQueryResult> {
  
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    // Initialize the Trino custom client with full connection options
    const connectionConfig: any = {
      host: server.config?.host || 'localhost',
      port: server.config?.port || 8080,
      user: server.config?.user || 'trino',
      catalog: server.config?.catalog || 'default',
      schema: database.database || 'default',
      ssl: server.config?.ssl || false
    };

    // Add authentication options based on config
    if (server.config?.password) {
      connectionConfig.password = server.config.password;
    }
    
    // Handle authentication types if specified
    if (server.config?.authType) {
      switch (server.config.authType) {
        case 'kerberos':
          connectionConfig.kerberos = true;
          if (server.config?.kerberosServiceName) {
            connectionConfig.kerberosServiceName = server.config.kerberosServiceName;
          }
          if (server.config?.kerberosPrincipal) {
            connectionConfig.kerberosPrincipal = server.config.kerberosPrincipal;
          }
          if (server.config?.kerberosRemoteServiceName) {
            connectionConfig.kerberosRemoteServiceName = server.config.kerberosRemoteServiceName;
          }
          break;
          
        case 'jwt':
          if (server.config?.accessToken) {
            connectionConfig.accessToken = server.config.accessToken;
          }
          break;
          
        case 'oauth':
          if (server.config?.accessToken) {
            connectionConfig.accessToken = server.config.accessToken;
          }
          break;
          
        case 'basic':
        default:
          // Basic auth is handled by the default password setting
          break;
      }
    }
    
    // SSL/TLS options
    if (server.config?.ssl) {
      connectionConfig.ssl = true;
      
      // Add SSL certificate options if provided
      if (server.config?.sslCaFile) {
        connectionConfig.sslCaFile = server.config.sslCaFile;
      }
      
      if (server.config?.sslKeyFile) {
        connectionConfig.sslKeyFile = server.config.sslKeyFile;
      }
      
      if (server.config?.sslCertFile) {
        connectionConfig.sslCertFile = server.config.sslCertFile;
      }
      
      // Optional: reject unauthorized SSL certificates
      if (server.config?.sslRejectUnauthorized !== undefined) {
        connectionConfig.rejectUnauthorized = server.config.sslRejectUnauthorized;
      }
    }
    
    // Add additional connection options if provided
    if (server.config?.connectionTimeout) {
      connectionConfig.connectTimeout = server.config.connectionTimeout;
    }
    
    // Add query timeout if provided
    if (server.config?.queryTimeout) {
      connectionConfig.queryTimeout = server.config.queryTimeout;
    }
    
    // Create a Knex instance with our custom Trino client
    const knex = knexlib({
      client: TrinoKnexClient,
      connection: connectionConfig
    });
    
    super(knex, trinoContext, server, database);
    
    this.dialect = 'trino';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    
    // Initialize necessary properties to prevent errors
    if (!this.server.db) {
      this.server.db = {};
    }
    
    if (this.database.database) {
      this.server.db[this.database.database] = {};
    }
  }

  async versionString(): Promise<string> {
    try {
      const result = await this.rawExecuteQuery(generateVersionQuery(), {});
      if (result.rows.length > 0 && result.rows[0].version) {
        return `Trino ${result.rows[0].version}`;
      }
      return 'Trino';
    } catch (err) {
      log.error('Error getting version string', err);
      return 'Trino';
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
      transactions: false
    };
  }

  async connect(): Promise<void> {
    log.debug('connect() called');
    
    try {
      // Test the connection by checking version information
      const versionQuery = generateVersionQuery();
      const result = await this.executeQuery(versionQuery);
      
      // Verify the connection credentials by checking catalog access
      if (this.server.config?.catalog) {
        try {
          // Test if we can access the specified catalog
          const catalogQuery = `SELECT schema_name FROM ${this.server.config.catalog}.information_schema.schemata LIMIT 1`;
          await this.executeQuery(catalogQuery);
        } catch (catalogErr) {
          log.warn(`Connected to Trino, but couldn't access catalog ${this.server.config.catalog}`, catalogErr);
          // We don't throw here because we're still connected to the server,
          // even if the specific catalog isn't accessible
        }
      }
      
      // Test schema access if a schema is specified
      if (this.database.database && this.database.database !== 'default') {
        try {
          // Test if we can access the specified schema 
          const schemaQuery = `
            SELECT 1 
            FROM ${this.server.config?.catalog || 'default'}.information_schema.schemata 
            WHERE schema_name = '${this.database.database}'
            LIMIT 1
          `;
          const schemaResult = await this.executeQuery(schemaQuery);
          
          // If the schema doesn't exist or isn't accessible, warn but don't fail
          if (schemaResult[0].rows.length === 0) {
            log.warn(`Connected to Trino, but schema '${this.database.database}' doesn't exist or isn't accessible`);
          }
        } catch (schemaErr) {
          log.warn(`Connected to Trino, but couldn't verify schema '${this.database.database}'`, schemaErr);
          // We don't throw here for the same reason as catalog access
        }
      }
      
      log.debug('Connection successful');
    } catch (err) {
      log.error('Connection failed', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    log.debug('disconnect() called');
    // Simple implementation that avoids errors when database properties are not set
    try {
      await this.knex?.destroy();
    } catch (err) {
      log.error('Error disconnecting', err);
    }
  }

  // Required functions from BasicDatabaseClient - minimal implementation
  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    try {
      const result = await this.rawExecuteQuery(
        generateListTablesQuery(filter),
        {}
      );
      
      return result.rows.map(row => ({
        name: row.name,
        schema: row.schema,
        catalog: row.catalog,
        entityType: 'table'
      }));
    } catch (err) {
      log.error('Error listing tables', err);
      return [];
    }
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    try {
      const result = await this.rawExecuteQuery(
        generateListViewsQuery(filter),
        {}
      );
      
      return result.rows.map(row => ({
        name: row.name,
        schema: row.schema,
        catalog: row.catalog,
        entityType: 'view'
      }));
    } catch (err) {
      log.error('Error listing views', err);
      return [];
    }
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    if (!table) return [];
    
    schema = schema || this.database.name;
    const catalog = this.server.config?.catalog || 'default';
    
    try {
      const result = await this.rawExecuteQuery(
        generateListColumnsQuery(table, schema, catalog),
        {}
      );
      
      return result.rows.map(row => ({
        columnName: row.columnName,
        dataType: row.dataType,
        nullable: row.isNullable === 'YES',
        defaultValue: row.defaultValue,
        comment: row.comment,
        virtual: false,
        array: row.dataType.toLowerCase().includes('array')
      }));
    } catch (err) {
      log.error('Error listing columns', err);
      return [];
    }
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return [];
  }

  async listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    return [];
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    try {
      const catalog = filter?.catalog || this.server.config?.catalog || 'default';
      const result = await this.rawExecuteQuery(
        generateListSchemasQuery(catalog),
        {}
      );
      
      return result.rows.map(row => row.schema_name);
    } catch (err) {
      log.error('Error listing schemas', err);
      return [];
    }
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    // Note: Some Trino connectors may not support foreign key references
    return [];
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    // Note: Some Trino connectors may not support primary/foreign keys
    return [];
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    try {
      const result = await this.rawExecuteQuery(queryText, options || {});
      
      return [{
        rowCount: result.rows.length,
        fields: result.columns.map(col => this.parseTableColumn(col)),
        rows: result.rows,
        messages: [],
        error: null,
        queryType: result.queryType || 'SELECT',
        affectedRows: this.getAffectedRows(result)
      }];
    } catch (err) {
      log.error('Error executing query', err);
      throw err;
    }
  }
  
  // Helper to determine affected rows for DML statements
  private getAffectedRows(result: TrinoQueryResult): number {
    // For non-SELECT queries that don't return rows, try to determine affected rows
    if (result.queryType && result.queryType !== 'SELECT') {
      // For standard DML operations (INSERT, UPDATE, DELETE), Trino returns no rows
      // But may have specific metadata that could be used in the future
      if (result.rows.length === 1) {
        // Some Trino statements return a row with affected count
        const firstRow = result.rows[0];
        if (typeof firstRow === 'object') {
          // Look for fields that might indicate affected rows
          const possibleFields = ['affected_rows', 'row_count', 'count', 'updated', 'deleted', 'inserted'];
          for (const field of possibleFields) {
            if (field in firstRow && typeof firstRow[field] === 'number') {
              return firstRow[field];
            }
          }
        }
      }
      
      // Default affected rows for DML statements with no explicit count
      return 0;
    }
    
    // For SELECT queries, affected rows is 0
    return 0;
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    try {
      // In Trino, "databases" are actually catalogs
      const result = await this.rawExecuteQuery(
        generateListCatalogsQuery(),
        {}
      );
      
      return result.rows.map(row => row.catalog_name);
    } catch (err) {
      log.error('Error listing catalogs', err);
      return [];
    }
  }

  async getTableProperties(_table: string, _schema?: string): Promise<TableProperties> {
    return {
      schema: _schema || '',
      table: _table,
      tableProperties: [],
      columnProperties: []
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    schema = schema || this.database.name;
    return `SELECT * FROM "${schema}"."${table}" LIMIT ${limit}`;
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string> {
    return '';
  }

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    return [];
  }

  async listCharsets(): Promise<string[]> {
    return ['UTF8'];
  }

  async getDefaultCharset(): Promise<string> {
    return 'UTF8';
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    schema = schema || this.database.name;
    
    try {
      const result = await this.rawExecuteQuery(
        generateCountQuery(table, schema),
        {}
      );
      
      return result.rows[0].count;
    } catch (err) {
      log.error('Error getting table length', err);
      return 0;
    }
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    schema = schema || this.database.name;
    const selectClause = selects && selects.length > 0 ? selects.join(', ') : '*';
    
    let query = `SELECT ${selectClause} FROM "${schema}"."${table}"`;
    
    // Add WHERE clause if filters are provided
    if (filters && (typeof filters === 'string' || filters.length > 0)) {
      query += ` WHERE ${typeof filters === 'string' ? filters : '1=1'}`; // Simplified
    }
    
    // Add ORDER BY clause if orderBy is provided
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(ord => `"${ord.field}" ${ord.dir}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    try {
      const result = await this.rawExecuteQuery(query, {});
      
      return {
        result: result.rows,
        totalRows: await this.getTableLength(table, schema),
        extendedColumns: await this.listTableColumns(table, schema)
      };
    } catch (err) {
      log.error('Error selecting top', err);
      throw err;
    }
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    schema = schema || this.database.name;
    return generateSelectTopSql(table, schema, offset, limit, orderBy, filters, selects);
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    schema = schema || this.database.name;
    const query = await this.selectTopSql(table, 0, Number.MAX_SAFE_INTEGER, orderBy, filters, schema);
    return this.queryStream(query, chunkSize);
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const connectionConfig = {
      host: this.server.config?.host || 'localhost',
      port: this.server.config?.port || 8080,
      user: this.server.config?.user || 'trino',
      password: this.server.config?.password,
      catalog: this.server.config?.catalog || 'default',
      schema: this.database.database || 'default',
      ssl: this.server.config?.ssl || false
    };

    const cursor = new TrinoCursor({
      connectionConfig,
      query,
      chunkSize
    });

    await cursor.start();

    // Read the first chunk to get column metadata
    const rows = await cursor.read();
    
    if (rows.length === 0) {
      // No results, return empty data
      return {
        cursor,
        fields: [],
        totalRows: 0
      };
    }

    // Use the TrinoKnexClient to get column metadata
    // For simplicity, we'll just infer from the first row
    const fields = Object.keys(rows[0]).map(key => ({
      name: key,
      bksType: this.inferBksType(rows[0][key])
    }));

    try {
      // Get the total row count (may be approximate)
      const totalRows = await this.getApproximateRowCount(query);
      
      return {
        cursor,
        fields,
        totalRows
      };
    } catch (err) {
      log.warn('Error getting total rows for stream', err);
      return {
        cursor,
        fields,
        totalRows: -1 // Unknown count
      };
    }
  }
  
  // Helper method to get approximate row count for a query
  private async getApproximateRowCount(query: string): Promise<number> {
    try {
      const countQuery = `SELECT count(*) as count FROM (${query}) t`;
      const result = await this.rawExecuteQuery(countQuery, {});
      return result.rows[0].count;
    } catch (err) {
      log.warn('Could not get approximate row count', err);
      return -1; // Unknown count
    }
  }
  
  // Helper method to infer BksType from a value
  private inferBksType(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return 'INTEGER';
      return 'REAL';
    }
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'string') return 'TEXT';
    if (value instanceof Date) return 'DATETIME';
    if (Array.isArray(value)) return 'ARRAY';
    if (typeof value === 'object') return 'JSON';
    return 'UNKNOWN';
  }

  wrapIdentifier(value: string): string {
    if (value === '*') return value;
    return `"${value.replaceAll(/"/g, '""')}"`;
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<TrinoQueryResult> {
    try {
      log.debug('Executing Trino query:', q);
      
      // Create a Trino cursor for proper HTTP pagination
      const connectionConfig = {
        host: this.server.config?.host || 'localhost',
        port: this.server.config?.port || 8080,
        user: this.server.config?.user || 'trino',
        password: this.server.config?.password,
        catalog: this.server.config?.catalog || 'default',
        schema: this.database.database || 'default',
        ssl: this.server.config?.ssl || false
      };
      
      // Use the TrinoCursor to handle pagination properly
      const cursor = new TrinoCursor({
        connectionConfig,
        query: q,
        // Use a large chunk size for non-streaming queries
        chunkSize: 10000
      });
      
      // Start the cursor
      await cursor.start();
      
      // Accumulate all results
      let allRows: any[] = [];
      let columns: { name: string, type: string }[] = [];
      let queryType = 'UNKNOWN';
      
      // Determine query type by looking at the first token in the query
      const trimmedQuery = q.trim().toLowerCase();
      if (trimmedQuery.startsWith('select')) {
        queryType = 'SELECT';
      } else if (trimmedQuery.startsWith('insert')) {
        queryType = 'INSERT';
      } else if (trimmedQuery.startsWith('update')) {
        queryType = 'UPDATE';
      } else if (trimmedQuery.startsWith('delete')) {
        queryType = 'DELETE';
      } else if (trimmedQuery.startsWith('create')) {
        queryType = 'CREATE';
      } else if (trimmedQuery.startsWith('drop')) {
        queryType = 'DROP';
      } else if (trimmedQuery.startsWith('alter')) {
        queryType = 'ALTER';
      } else if (trimmedQuery.startsWith('show')) {
        queryType = 'SHOW';
      } else if (trimmedQuery.startsWith('with')) {
        // WITH clauses are typically for CTEs in SELECT queries
        queryType = 'SELECT';
      }
      
      try {
        // Read all results in chunks until there's no more data
        while (true) {
          const chunk = await cursor.read();
          if (chunk.length === 0) break;
          
          // Add chunk to accumulated rows
          allRows = allRows.concat(chunk);
          
          // If this is the first chunk, extract column information
          if (allRows.length > 0 && columns.length === 0) {
            // For object mode, extract column names from the first row
            if (typeof allRows[0] === 'object' && !Array.isArray(allRows[0])) {
              columns = Object.keys(allRows[0]).map(key => ({ 
                name: key, 
                type: this.inferColumnType(allRows[0][key])
              }));
            }
          }
        }
      } finally {
        // Always cancel the cursor to clean up resources
        await cursor.cancel();
      }
      
      // Format the results in the expected TrinoQueryResult format
      return {
        columns: columns.length > 0 ? columns : [],
        rows: allRows,
        arrayMode: false,
        queryType: queryType
      };
    } catch (err) {
      log.error('Error executing query', err, q);
      throw err;
    }
  }
  
  // Helper method to infer column type from a value
  private inferColumnType(value: any): string {
    if (value === null || value === undefined) return 'null';
    const type = typeof value;
    
    if (type === 'number') {
      if (Number.isInteger(value)) return 'integer';
      return 'double';
    } else if (type === 'string') {
      // Try to detect if it's a date/time value
      if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'timestamp';
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'date';
      }
      return 'varchar';
    } else if (type === 'boolean') {
      return 'boolean';
    } else if (Array.isArray(value)) {
      return 'array';
    } else if (type === 'object') {
      return 'map';
    }
    
    return 'unknown';
  }

  protected parseTableColumn(column: any): BksField {
    const name = column.name || column.columnName;
    const dataType = column.type || column.dataType || '';
    
    // Map Trino data types to BksTypes
    let bksType = 'UNKNOWN';
    
    // Simple type mapping
    if (/^varchar|text|char|json|varbinary|array/.test(dataType.toLowerCase())) {
      bksType = 'TEXT';
    } else if (/^bool/.test(dataType.toLowerCase())) {
      bksType = 'BOOLEAN';
    } else if (/^tinyint|smallint|integer|bigint|int/.test(dataType.toLowerCase())) {
      bksType = 'INTEGER';
    } else if (/^decimal|numeric|double|real|float/.test(dataType.toLowerCase())) {
      bksType = 'REAL';
    } else if (/^date/.test(dataType.toLowerCase())) {
      bksType = 'DATE';
    } else if (/^time/.test(dataType.toLowerCase())) {
      bksType = 'TIME';
    } else if (/^timestamp/.test(dataType.toLowerCase())) {
      bksType = 'DATETIME';
    } else if (/^array/.test(dataType.toLowerCase())) {
      bksType = 'ARRAY';
    } else if (/^map|json/.test(dataType.toLowerCase())) {
      bksType = 'JSON';
    }
    
    return {
      name,
      bksType
    };
  }
}