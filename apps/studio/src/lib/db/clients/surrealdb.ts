import { Surreal } from 'surrealdb';
import { BaseV1DatabaseClient } from './BaseV1DatabaseClient';
import { SupportedFeatures, FilterOptions, TableOrView, Routine, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, BksFieldType, TableChanges, TableUpdateResult } from '../models';
import { DatabaseElement, IDbConnectionDatabase } from '../types';
import { IDbConnectionServer } from '../backendTypes';
import rawLog from '@bksLogger';
import { TableKey } from '@shared/lib/dialects/models';
import { SurrealDBData, surrealEscapeValue } from '@shared/lib/dialects/surrealdb';

const log = rawLog.scope('surrealdb');

export interface SurrealDBResult {
  result: any[];
  status: string;
  time: string;
}

export interface SurrealDBQueryResult {
  rows: any[];
  columns: { name: string }[];
  arrayMode: boolean;
}

export class SurrealDBClient extends BaseV1DatabaseClient<SurrealDBQueryResult> {
  version: SurrealDBResult;
  db: Surreal;
  connectionString: string;
  dialectData = SurrealDBData;
  
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, null, server, database);
    
    this.dialect = 'surrealdb';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.db = new Surreal();
  }

  async versionString(): Promise<string> {
    try {
      const result = await this.db.version();
      return result || 'Unknown';
    } catch (error) {
      log.error('Failed to get version:', error);
      return 'Unknown';
    }
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
    };
  }

  async connect(): Promise<void> {
    await super.connect();

    try {
      const { host, port, user, password } = this.server.config;
      const { database } = this.database;
      
      // Construct connection URL
      const protocol = this.server.config.ssl ? 'wss' : 'ws';
      this.connectionString = `${protocol}://${host || 'localhost'}:${port || 8000}/rpc`;
      
      log.info('Connecting to SurrealDB:', this.connectionString);
      
      // Connect to SurrealDB
      await this.db.connect(this.connectionString);
      
      // Authenticate if credentials provided
      if (user && password) {
        await this.db.signin({
          username: user,
          password: password
        });
      }
      
      // Use namespace and database
      // For simplicity, we'll use 'beekeeper' as namespace if not specified
      const namespace = this.server.config.options?.namespace || 'beekeeper';
      const dbName = database || 'main';
      
      await this.db.use({ 
        namespace: namespace, 
        database: dbName 
      });
      
      // Test connection
      await this.db.query('INFO FOR DB');
      
      log.info('Successfully connected to SurrealDB');
    } catch (error) {
      log.error('Failed to connect to SurrealDB:', error);
      throw new Error(`SurrealDB Connection Error: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
      }
    } catch (error) {
      log.error('Error disconnecting from SurrealDB:', error);
    }
    await super.disconnect();
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    try {
      const result = await this.db.query('INFO FOR DB');
      const dbInfo = result[0]?.result;
      
      if (dbInfo && dbInfo.tb) {
        return Object.keys(dbInfo.tb).map(name => ({ name }));
      }
      
      return [];
    } catch (error) {
      log.error('Failed to list tables:', error);
      return [];
    }
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    // SurrealDB doesn't have traditional views, return empty array
    return [];
  }

  listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    // SurrealDB functions are different from traditional routines
    return Promise.resolve([]);
  }

  listMaterializedViewColumns(_table: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    return Promise.resolve([]);
  }

  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    if (!table) {
      // Return columns for all tables
      const tables = await this.listTables();
      const allColumns: ExtendedTableColumn[] = [];
      
      for (const t of tables) {
        const columns = await this.listTableColumns(t.name);
        allColumns.push(...columns);
      }
      
      return allColumns;
    }

    try {
      // Get table info to understand the structure
      const result = await this.db.query(`INFO FOR TABLE ${table}`);
      const tableInfo = result[0]?.result;
      
      const columns: ExtendedTableColumn[] = [];
      
      if (tableInfo && tableInfo.fd) {
        // Process field definitions
        Object.entries(tableInfo.fd).forEach(([fieldName, fieldInfo]: [string, any], index) => {
          columns.push({
            tableName: table,
            columnName: fieldName,
            dataType: fieldInfo.kind || 'UNKNOWN',
            nullable: !fieldInfo.assert,
            defaultValue: fieldInfo.value || null,
            ordinalPosition: index + 1,
            hasDefault: !!fieldInfo.value,
            generated: false,
            bksField: this.parseTableColumn({ name: fieldName, type: fieldInfo.kind })
          });
        });
      }
      
      // If no field definitions, try to infer from sample data
      if (columns.length === 0) {
        const sampleResult = await this.db.query(`SELECT * FROM ${table} LIMIT 1`);
        if (sampleResult[0]?.result && sampleResult[0].result.length > 0) {
          const sample = sampleResult[0].result[0];
          Object.keys(sample).forEach((key, index) => {
            if (key !== 'id') { // Skip SurrealDB's id field
              columns.push({
                tableName: table,
                columnName: key,
                dataType: typeof sample[key],
                nullable: true,
                defaultValue: null,
                ordinalPosition: index + 1,
                hasDefault: false,
                generated: false,
                bksField: this.parseTableColumn({ name: key, type: typeof sample[key] })
              });
            }
          });
        }
      }
      
      return columns;
    } catch (error) {
      log.error('Failed to list table columns:', error);
      return [];
    }
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    // SurrealDB doesn't have traditional triggers
    return [];
  }

  async listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    // SurrealDB has indexes but they're defined differently
    return [];
  }

  listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    // SurrealDB uses namespaces, not schemas
    return Promise.resolve([]);
  }

  getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    // SurrealDB doesn't have traditional foreign keys
    return [];
  }

  async query(queryText: string, options?: any): Promise<CancelableQuery> {
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        return await this.executeQuery(queryText, options);
      },
      async cancel() {
        // SurrealDB doesn't support query cancellation in the current implementation
        log.warn('Query cancellation not supported for SurrealDB');
      }
    };
  }

  async executeQuery(queryText: string, options: any = {}): Promise<NgQueryResult[]> {
    const results = options.multiple 
      ? await this.driverExecuteMultiple(queryText, options)
      : [await this.driverExecuteSingle(queryText, options)];
    
    return results.map(result => ({
      command: queryText.trim().split(' ')[0].toUpperCase(),
      rows: result.rows,
      fields: result.columns.map(col => ({ name: col.name, id: col.name })),
      rowCount: result.rows.length,
      affectedRows: result.rows.length,
    }));
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    try {
      const result = await this.db.query('INFO FOR NS');
      const nsInfo = result[0]?.result;
      
      if (nsInfo && nsInfo.db) {
        return Object.keys(nsInfo.db);
      }
      
      return [];
    } catch (error) {
      log.error('Failed to list databases:', error);
      return [];
    }
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${table} LIMIT ${limit}`;
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties> {
    const length = await this.getTableLength(table);
    const indexes = await this.listTableIndexes(table);
    const triggers = await this.listTableTriggers(table);
    const relations = await this.getTableKeys(table);
    
    return {
      size: length,
      indexes,
      relations,
      triggers,
      partitions: []
    };
  }

  listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return Promise.resolve([]);
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string | null> {
    // SurrealDB uses 'id' as the primary key by default
    return 'id';
  }

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    return [{
      columnName: 'id',
      position: 1
    }];
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    try {
      const result = await this.db.query(`SELECT count() FROM ${table} GROUP ALL`);
      return result[0]?.result?.[0]?.count || 0;
    } catch (error) {
      log.error('Failed to get table length:', error);
      return 0;
    }
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const sql = await this.selectTopSql(table, offset, limit, orderBy, filters, _schema, selects);
    const results = await this.executeQuery(sql);
    const result = results[0];
    
    if (!result) {
      return { result: [], fields: [] };
    }

    const fields = result.fields.map(f => this.parseTableColumn({ name: f.name, type: 'unknown' }));
    return { result: result.rows, fields };
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<string> {
    const escapedTable = this.dialectData.wrapIdentifier(table);
    const selectFields = selects 
      ? selects.map(field => this.dialectData.wrapIdentifier(field)).join(', ')
      : '*';
    
    let query = `SELECT ${selectFields} FROM ${escapedTable}`;
    
    // Add filters
    if (filters && filters.length > 0) {
      if (typeof filters === 'string') {
        query += ` WHERE ${filters}`;
      } else {
        const filterClauses = filters.map(filter => {
          const escapedField = this.dialectData.wrapIdentifier(filter.field);
          const escapedValue = surrealEscapeValue(filter.value);
          return `${escapedField} ${filter.type === '=' ? '==' : filter.type} ${escapedValue}`;
        });
        query += ` WHERE ${filterClauses.join(' AND ')}`;
      }
    }
    
    // Add ordering
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(order => {
        const escapedField = this.dialectData.wrapIdentifier(order.field);
        return `${escapedField} ${order.dir?.toUpperCase() || 'ASC'}`;
      });
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // Add pagination
    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) {
        query += ` START ${offset}`;
      }
    }
    
    return query;
  }

  async selectTopStream(_table: string, _orderBy: OrderBy[], _filters: string | TableFilter[], _chunkSize: number, _schema?: string): Promise<StreamResults> {
    throw new Error('Stream results not implemented for SurrealDB');
  }

  async queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error('Stream results not implemented for SurrealDB');
  }

  async executeApplyChanges(_changes: TableChanges): Promise<TableUpdateResult[]> {
    throw new Error('Apply changes not implemented for SurrealDB');
  }

  async setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error('Table descriptions not supported in SurrealDB');
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    throw new Error('Renaming elements not supported in SurrealDB');
  }

  async dropElement(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    throw new Error('Dropping elements not implemented for SurrealDB');
  }

  async truncateElementSql(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    throw new Error('Truncating elements not implemented for SurrealDB');
  }

  async duplicateTable(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<void> {
    throw new Error('Duplicating tables not supported in SurrealDB');
  }

  async duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<string> {
    throw new Error('Duplicating tables not supported in SurrealDB');
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return 'UTF-8';
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async createDatabase(_databaseName: string, _charset: string, _collation: string): Promise<string> {
    throw new Error('Creating databases not implemented for SurrealDB');
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error('Creating databases not implemented for SurrealDB');
  }

  async getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    throw new Error('Table create scripts not available for SurrealDB');
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    throw new Error('Truncating all tables not implemented for SurrealDB');
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SurrealDBQueryResult | SurrealDBQueryResult[]> {
    try {
      const result = await this.db.query(q);
      
      const surrealResults = result.map((queryResult) => {
        const data = queryResult.result || [];
        const rows = Array.isArray(data) ? data : [data];
        
        // Extract field names from the first row if available
        const columns = rows.length > 0 
          ? Object.keys(rows[0]).map(name => ({ name }))
          : [];

        return {
          rows,
          columns,
          arrayMode: false
        };
      });
      
      return options.multiple ? surrealResults : surrealResults[0];
    } catch (error) {
      log.error('Raw query execution failed:', error);
      throw error;
    }
  }

  wrapIdentifier(value: string): string {
    return this.dialectData.wrapIdentifier(value);
  }

  parseTableColumn(column: { name: string, type: string }): BksField {
    let bksType: BksFieldType = "UNKNOWN";
    
    switch (column.type?.toLowerCase()) {
      case 'string':
      case 'text':
        bksType = "STRING";
        break;
      case 'number':
      case 'int':
      case 'float':
        bksType = "NUMBER";
        break;
      case 'boolean':
      case 'bool':
        bksType = "BOOLEAN";
        break;
      case 'datetime':
      case 'date':
        bksType = "DATE";
        break;
      case 'object':
        bksType = "JSON";
        break;
      case 'array':
        bksType = "ARRAY";
        break;
      default:
        bksType = "UNKNOWN";
    }
    
    return { name: column.name, bksType };
  }
}