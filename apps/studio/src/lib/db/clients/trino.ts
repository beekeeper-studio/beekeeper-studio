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

const log = logRaw.scope('trino');

// Very basic QueryResult type
export interface TrinoQueryResult {
  columns: { name: string }[];
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
}

// Define a minimal Trino context
const trinoContext: AppContextProvider = NoOpContextProvider;

export class TrinoClient extends BaseV1DatabaseClient<TrinoQueryResult> {
  
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    // Initialize the Trino custom client
    const connectionConfig = {
      host: server.config?.host || 'localhost',
      port: server.config?.port || 8080,
      user: server.config?.user || 'trino',
      password: server.config?.password,
      catalog: server.config?.catalog || 'default',
      schema: database.database || 'default',
      ssl: server.config?.ssl || false
    };

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
      const result = await this.rawExecuteQuery('SELECT 1 as version', {});
      return 'Trino (Version TBD)';
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
    // Basic implementation - just test if we can execute a simple query
    try {
      const result = await this.executeQuery('SELECT 1 as test');
      log.debug('Connection successful', result);
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
    const schema = filter?.schema || this.database.name;
    
    try {
      const result = await this.rawExecuteQuery(
        `SELECT table_name as name, table_schema as schema 
         FROM information_schema.tables 
         WHERE table_schema = '${schema}'`,
        {}
      );
      
      return result.rows.map(row => ({
        name: row.name,
        schema: row.schema,
        entityType: 'table'
      }));
    } catch (err) {
      log.error('Error listing tables', err);
      return [];
    }
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
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
    
    try {
      const result = await this.rawExecuteQuery(
        `SELECT column_name as columnName, data_type as dataType 
         FROM information_schema.columns 
         WHERE table_schema = '${schema}' AND table_name = '${table}'`,
        {}
      );
      
      return result.rows.map(row => ({
        columnName: row.columnName,
        dataType: row.dataType,
        nullable: true,
        defaultValue: null,
        comment: null,
        virtual: false,
        array: false
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

  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    try {
      const result = await this.rawExecuteQuery(
        `SELECT schema_name FROM information_schema.schemata`,
        {}
      );
      
      return result.rows.map(row => row.schema_name);
    } catch (err) {
      log.error('Error listing schemas', err);
      return [];
    }
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
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
        queryType: 'SELECT',
        affectedRows: 0
      }];
    } catch (err) {
      log.error('Error executing query', err);
      throw err;
    }
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    try {
      const result = await this.rawExecuteQuery(
        `SELECT schema_name FROM information_schema.schemata`,
        {}
      );
      
      return result.rows.map(row => row.schema_name);
    } catch (err) {
      log.error('Error listing databases', err);
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
        `SELECT COUNT(*) as count FROM "${schema}"."${table}"`,
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
    
    return query;
  }

  async selectTopStream(_table: string, _orderBy: OrderBy[], _filters: string | TableFilter[], _chunkSize: number, _schema?: string): Promise<StreamResults> {
    throw new Error('Method not implemented: selectTopStream');
  }

  async queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error('Method not implemented: queryStream');
  }

  wrapIdentifier(value: string): string {
    if (value === '*') return value;
    return `"${value.replaceAll(/"/g, '""')}"`;
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<TrinoQueryResult> {
    try {
      log.debug('Executing Trino query:', q);
      
      // Use the knex client to execute the query
      const result = await this.knex.raw(q);
      
      // Knex returns an array where the first element contains the data
      if (Array.isArray(result) && result.length > 0) {
        // Extract the result data and convert to our expected format
        const rows = result[0] || [];
        const fields = result[1] || [];
        
        return {
          columns: fields.map((field: any) => ({ name: field.name })),
          rows: rows,
          arrayMode: false
        };
      }
      
      // Handle case when no data is returned
      return {
        columns: [],
        rows: [],
        arrayMode: false
      };
    } catch (err) {
      log.error('Error executing query', err, q);
      throw err;
    }
  }

  protected parseTableColumn(column: any): BksField {
    return {
      name: column.name || column.columnName,
      bksType: 'UNKNOWN'
    };
  }
}