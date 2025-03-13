// Snowflake client for Beekeeper Studio
import { BaseV1DatabaseClient } from './BaseV1DatabaseClient';
import { IDbConnectionDatabase, IDbConnectionServer } from '../backendTypes';
import { AppContextProvider, BaseQueryResult, ExecutionContext, NoOpContextProvider, QueryLogOptions } from './BasicDatabaseClient';
import { ConnectionType, DatabaseElement, DatabaseFilterOptions, FilterOptions, SchemaFilterOptions } from '../types';
import { BksField, CancelableQuery, ExtendedTableColumn, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, StreamResults, SupportedFeatures, TableColumn, TableFilter, TableIndex, TableKey, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger } from '../models';
import logRaw from '@bksLogger';
import { NoOpCursor } from '../models';
import { buildDatabaseFilter, buildSchemaFilter, joinFilters } from './utils';
import _ from 'lodash';

const log = logRaw.scope('snowflake');

// Define a Snowflake query result type
interface SnowflakeQueryResult extends BaseQueryResult {
  // Additional Snowflake-specific properties can be added here
}

// Define the Snowflake client class
export class SnowflakeClient extends BaseV1DatabaseClient<SnowflakeQueryResult> {
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase, contextProvider: AppContextProvider = NoOpContextProvider) {
    super(null, contextProvider, server, database);
    this.dialect = 'generic'; // Use generic dialect for now
    this.readOnlyMode = true; // Start with read-only mode
  }

  // Implementation of abstract methods
  async versionString(): Promise<string> {
    return 'Snowflake v1 (Read-Only)';
  }

  async defaultSchema(): Promise<string | null> {
    return 'PUBLIC';
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

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        table_schema as schema,
        table_name as name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name
    `;

    const data = await this.driverExecuteSingle(sql);
    return data.rows.map(row => ({
      schema: row.schema,
      name: row.name,
      entityType: 'table'
    }));
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        table_schema as schema,
        table_name as name
      FROM information_schema.views
        ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name
    `;

    const data = await this.driverExecuteSingle(sql);
    return data.rows.map(row => ({
      schema: row.schema,
      name: row.name,
      entityType: 'view'
    }));
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    const schemaFilter = buildSchemaFilter(filter, 'routine_schema');
    const sql = `
      SELECT
        routine_schema as schema,
        routine_name as name,
        routine_type,
        data_type as return_type
      FROM information_schema.routines
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY routine_schema, routine_name
    `;

    const data = await this.driverExecuteSingle(sql);
    
    return data.rows.map(row => ({
      schema: row.schema,
      name: row.name,
      id: `${row.schema}.${row.name}`,
      type: row.routine_type.toLowerCase() as any,
      returnType: row.return_type,
      entityType: 'routine'
    }));
  }

  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    // Snowflake doesn't have true materialized views like PostgreSQL
    // We'll return an empty array for now
    return [];
  }

  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    const clause = table ? "WHERE table_schema = $1 AND table_name = $2" : "";
    const params = table ? [schema, table] : [];
    
    const sql = `
      SELECT
        table_schema,
        table_name,
        column_name,
        is_nullable,
        ordinal_position,
        column_default,
        data_type
      FROM information_schema.columns
      ${clause}
      ORDER BY table_schema, table_name, ordinal_position
    `;

    const data = await this.driverExecuteSingle(sql, { params });

    return data.rows.map((row: any) => ({
      schemaName: row.table_schema,
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
      ordinalPosition: Number(row.ordinal_position),
      hasDefault: !_.isNil(row.column_default),
      bksField: this.parseTableColumn(row),
    }));
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    // Snowflake uses a different system for triggers
    // For now, returning an empty array
    return [];
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    // Snowflake doesn't use traditional indexes like other databases
    // Instead it uses clustering keys and micro-partitions
    return [];
  }

  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    // For now, returning an empty array
    return [];
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const schemaFilter = buildSchemaFilter(filter);
    const sql = `
      SELECT schema_name
      FROM information_schema.schemata
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY schema_name
    `;

    const data = await this.driverExecuteSingle(sql);
    return data.rows.map((row) => row.schema_name);
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    // For now, returning an empty array
    return [];
  }

  async listTablePartitions(table: string, schema?: string): Promise<TablePartition[]> {
    // Snowflake uses micro-partitions automatically
    return [];
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const data = await this.driverExecuteMultiple(queryText, options || {});
    return data.map(result => this.parseRowQueryResult(result));
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    const databaseFilter = buildDatabaseFilter(filter, 'database_name');
    const sql = `
      SHOW DATABASES
      ${databaseFilter && filter?.database ? `LIKE '%${filter.database}%'` : ''}
    `;

    const data = await this.driverExecuteSingle(sql);
    return data.rows.map((row) => row.name);
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties | null> {
    // For now, returning a basic properties object
    return {
      indexes: [],
      relations: [],
      triggers: []
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(schema || 'public')}.${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    // Snowflake doesn't have materialized views in the traditional sense
    return [];
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string | null> {
    const keys = await this.getPrimaryKeys(table, schema);
    return keys.length === 1 ? keys[0].columnName : null;
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    const sql = `
      SELECT
        column_name,
        key_sequence as position
      FROM information_schema.key_column_usage
      WHERE table_schema = $1
        AND table_name = $2
        AND constraint_name IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = $1
            AND table_name = $2
            AND constraint_type = 'PRIMARY KEY'
        )
      ORDER BY key_sequence
    `;
    
    const params = [schema || 'public', table];
    const data = await this.driverExecuteSingle(sql, { params });
    
    return data.rows.map((row) => ({
      columnName: row.column_name,
      position: Number(row.position)
    }));
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    const countSQL = `SELECT COUNT(*) as total FROM ${this.wrapIdentifier(schema || 'public')}.${this.wrapIdentifier(table)}`;
    const result = await this.driverExecuteSingle(countSQL);
    return result.rows[0]?.total || 0;
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
    const sql = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    const result = await this.driverExecuteSingle(sql);
    const fields = this.parseQueryResultColumns(result);
    return { result: result.rows, fields };
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
    schema = schema || 'public';
    selects = selects || ['*'];
    
    // Build ORDER BY clause
    let orderByString = '';
    if (orderBy && orderBy.length > 0) {
      orderByString = 'ORDER BY ' + orderBy.map(item => {
        if (_.isObject(item)) {
          return `${this.wrapIdentifier(item.field)} ${item.dir.toUpperCase()}`;
        } else {
          return this.wrapIdentifier(item as string);
        }
      }).join(', ');
    }
    
    // Build WHERE clause
    let filterString = '';
    if (_.isString(filters) && filters.toString().trim().length > 0) {
      filterString = `WHERE ${filters}`;
    } else if (_.isArray(filters) && filters.length > 0) {
      const filterClauses = (filters as TableFilter[]).map(filter => {
        if (filter.type === 'in' && _.isArray(filter.value)) {
          const values = (filter.value as string[]).map(val => `'${val}'`).join(', ');
          return `${this.wrapIdentifier(filter.field)} IN (${values})`;
        } else if (filter.type.includes('is')) {
          return `${this.wrapIdentifier(filter.field)} ${filter.type.toUpperCase()} NULL`;
        } else {
          return `${this.wrapIdentifier(filter.field)} ${filter.type.toUpperCase()} '${filter.value}'`;
        }
      });
      
      filterString = 'WHERE ' + joinFilters(filterClauses, filters as TableFilter[]);
    }
    
    return `
      SELECT ${selects.join(', ')}
      FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}
      ${filterString}
      ${orderByString}
      LIMIT ${limit}
      ${offset ? `OFFSET ${offset}` : ''}
    `;
  }

  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number,
    schema?: string
  ): Promise<StreamResults> {
    // Snowflake doesn't have a cursor API like PostgreSQL
    // This is a simplified version that doesn't stream
    const columns = await this.listTableColumns(table, schema);
    const totalRows = await this.getTableLength(table, schema);
    
    return {
      totalRows,
      columns,
      cursor: new NoOpCursor(chunkSize)
    };
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    // Similar to selectTopStream, we don't have a true streaming option
    // This is a simplified implementation
    const { columns, totalRows } = await this.getColumnsAndTotalRows(query);
    
    return {
      totalRows,
      columns,
      cursor: new NoOpCursor(chunkSize)
    };
  }

  wrapIdentifier(value: string): string {
    if (value === '*') return value;
    const matched = value.match(/(.*?)(\[[0-9]\])/);
    if (matched) return this.wrapIdentifier(matched[1]) + matched[2];
    return `"${value.replace(/"/g, '""')}"`;
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SnowflakeQueryResult | SnowflakeQueryResult[]> {
    // This is a placeholder for the actual Snowflake connection
    // In a real implementation, this would connect to Snowflake and execute the query
    
    // Sample implementation for demonstration
    if (options.multiple) {
      // Return multiple result sets
      return [
        {
          columns: [{ name: 'example_column' }],
          rows: [{ example_column: 'sample data' }],
          arrayMode: false
        }
      ];
    } else {
      // Return a single result set
      return {
        columns: [{ name: 'example_column' }],
        rows: [{ example_column: 'sample data' }],
        arrayMode: false
      };
    }
  }

  protected parseTableColumn(column: { column_name: string; data_type: string }): BksField {
    return {
      name: column.column_name,
      bksType: 'UNKNOWN' // Snowflake-specific types would be handled here
    };
  }

  protected parseQueryResultColumns(qr: SnowflakeQueryResult): BksField[] {
    return qr.columns.map(column => ({
      name: column.name,
      bksType: 'UNKNOWN' // Type detection based on Snowflake's data types
    }));
  }

  private parseRowQueryResult(data: SnowflakeQueryResult): NgQueryResult {
    const fields = this.parseQueryResultColumns(data).map((field) => ({
      name: field.name,
      id: field.name
    }));
    
    return {
      command: 'SELECT', // This would be determined by the actual query
      rows: data.rows,
      fields: fields,
      rowCount: data.rows.length
    };
  }

  // Implement remaining abstract methods required by BaseV1DatabaseClient
  
  async setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    log.error("Snowflake v1 driver does not support setting table descriptions");
    return '';
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    log.error("Snowflake v1 driver does not support renaming elements");
    return '';
  }

  async truncateElementSql(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    log.error("Snowflake v1 driver does not support truncating elements");
    return '';
  }

  async executeApplyChanges(_changes: any): Promise<any[]> {
    log.error("Snowflake v1 driver does not support applying changes");
    return [];
  }

  async dropElement(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    log.error("Snowflake v1 driver does not support dropping elements");
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    log.error("Snowflake v1 driver does not support truncating all tables");
  }
}