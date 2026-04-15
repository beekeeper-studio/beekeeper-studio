// Copyright (c) 2026 Beekeeper Studio Team

import { IBasicDatabaseClient } from '../db/types';
import { TableSchema, ColumnSchema, ForeignKeySchema, IndexSchema, SchemaInfo, TableDependency } from './types';
import log from 'electron-log/renderer';

export class SchemaExtractor {
  constructor(private client: IBasicDatabaseClient) {}

  /**
   * Extracts complete schema information including dependencies
   */
  async extractSchema(tables?: string[], schemaFilter?: string): Promise<SchemaInfo> {
    try {
      // Get all tables if not specified
      let tablesToMigrate = tables;
      if (!tablesToMigrate || tablesToMigrate.length === 0) {
        const allTables = await this.client.listTables({ schema: schemaFilter });
        tablesToMigrate = allTables.map(t => t.name);
      }

      const tableSchemas: TableSchema[] = [];
      const dependencies: TableDependency[] = [];

      // Extract schema for each table
      for (const tableName of tablesToMigrate) {
        const schema = await this.extractTableSchema(tableName, schemaFilter);
        tableSchemas.push(schema);

        // Extract dependencies from foreign keys
        const tableDeps: Array<{ table: string; schema?: string }> = [];
        for (const fk of schema.foreignKeys) {
          tableDeps.push({
            table: fk.referencedTable,
            schema: fk.referencedSchema || schemaFilter
          });
        }

        dependencies.push({
          table: tableName,
          schema: schemaFilter,
          dependsOn: tableDeps
        });
      }

      return {
        tables: tableSchemas,
        dependencies
      };
    } catch (error) {
      log.error('Error extracting schema:', error);
      throw error;
    }
  }

  /**
   * Extracts schema for a single table
   */
  async extractTableSchema(tableName: string, schemaName?: string): Promise<TableSchema> {
    try {
      // Get columns
      const columnsData = await this.client.listTableColumns(tableName, schemaName);
      const columns: ColumnSchema[] = columnsData.map(col => ({
        name: col.columnName,
        type: col.dataType,
        nullable: col.nullable !== false,
        defaultValue: col.defaultValue,
        autoIncrement: col.generated === 'auto_increment' || col.extra?.includes('auto_increment'),
        comment: col.comment
      }));

      // Get primary keys
      const primaryKeys = await this.client.getPrimaryKeys(tableName, schemaName);
      const pkColumns = primaryKeys.map(pk => pk.columnName);

      // Get foreign keys
      const foreignKeysData = await this.client.getOutgoingKeys(tableName, schemaName);
      const foreignKeys: ForeignKeySchema[] = foreignKeysData.map(fk => ({
        name: fk.constraintName,
        columns: fk.isComposite ? fk.columns : [fk.fromColumn],
        referencedTable: fk.toTable,
        referencedSchema: fk.toSchema,
        referencedColumns: fk.isComposite ? fk.referencedColumns : [fk.toColumn],
        onUpdate: fk.onUpdate,
        onDelete: fk.onDelete
      }));

      // Get indexes
      const indexesData = await this.client.listTableIndexes(tableName, schemaName);
      const indexes: IndexSchema[] = indexesData.map(idx => ({
        name: idx.name,
        columns: idx.columns || [idx.columnName],
        unique: idx.unique,
        type: idx.type
      }));

      // Get triggers (if supported)
      let triggers = [];
      try {
        const triggersData = await this.client.listTableTriggers(tableName, schemaName);
        triggers = triggersData.map(t => ({
          name: t.name,
          timing: t.timing,
          event: t.event,
          statement: t.statement
        }));
      } catch (error) {
        // Triggers might not be supported for this database type
        log.warn(`Triggers not supported or error fetching: ${error.message}`);
      }

      return {
        name: tableName,
        schema: schemaName,
        columns,
        primaryKeys: pkColumns,
        foreignKeys,
        indexes,
        triggers
      };
    } catch (error) {
      log.error(`Error extracting schema for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Generates CREATE TABLE statement from schema (generic SQL)
   */
  generateCreateTableSQL(schema: TableSchema, includeConstraints = true): string {
    const schemaPrefix = schema.schema ? `${this.quote(schema.schema)}.` : '';
    const tableName = `${schemaPrefix}${this.quote(schema.name)}`;
    
    const columnDefs = schema.columns.map(col => {
      let def = `  ${this.quote(col.name)} ${col.type}`;
      
      if (!col.nullable) {
        def += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        def += ` DEFAULT ${this.formatDefaultValue(col.defaultValue)}`;
      }
      
      if (col.autoIncrement) {
        def += ' AUTO_INCREMENT';
      }
      
      return def;
    });

    // Add primary key constraint
    if (includeConstraints && schema.primaryKeys.length > 0) {
      const pkCols = schema.primaryKeys.map(pk => this.quote(pk)).join(', ');
      columnDefs.push(`  PRIMARY KEY (${pkCols})`);
    }

    const createTable = `CREATE TABLE ${tableName} (\n${columnDefs.join(',\n')}\n);`;
    
    return createTable;
  }

  /**
   * Generates ALTER TABLE statements for foreign keys
   */
  generateForeignKeySQL(schema: TableSchema): string[] {
    const schemaPrefix = schema.schema ? `${this.quote(schema.schema)}.` : '';
    const tableName = `${schemaPrefix}${this.quote(schema.name)}`;
    
    return schema.foreignKeys.map(fk => {
      const fkCols = fk.columns.map(c => this.quote(c)).join(', ');
      const refSchemaPrefix = fk.referencedSchema ? `${this.quote(fk.referencedSchema)}.` : '';
      const refTable = `${refSchemaPrefix}${this.quote(fk.referencedTable)}`;
      const refCols = fk.referencedColumns.map(c => this.quote(c)).join(', ');
      
      let sql = `ALTER TABLE ${tableName} ADD CONSTRAINT ${this.quote(fk.name)} ` +
                `FOREIGN KEY (${fkCols}) REFERENCES ${refTable} (${refCols})`;
      
      if (fk.onUpdate) {
        sql += ` ON UPDATE ${fk.onUpdate}`;
      }
      
      if (fk.onDelete) {
        sql += ` ON DELETE ${fk.onDelete}`;
      }
      
      return sql + ';';
    });
  }

  /**
   * Generates CREATE INDEX statements
   */
  generateIndexSQL(schema: TableSchema): string[] {
    const schemaPrefix = schema.schema ? `${this.quote(schema.schema)}.` : '';
    const tableName = `${schemaPrefix}${this.quote(schema.name)}`;
    
    return schema.indexes
      .filter(idx => !idx.name.toLowerCase().includes('primary')) // Skip primary key indexes
      .map(idx => {
        const unique = idx.unique ? 'UNIQUE ' : '';
        const cols = idx.columns.map(c => this.quote(c)).join(', ');
        return `CREATE ${unique}INDEX ${this.quote(idx.name)} ON ${tableName} (${cols});`;
      });
  }

  /**
   * Quote identifier for SQL
   */
  private quote(identifier: string): string {
    // Default to backticks, can be overridden for specific databases
    return `\`${identifier}\``;
  }

  /**
   * Format default value for SQL
   */
  private formatDefaultValue(value: any): string {
    if (typeof value === 'string') {
      // Check if it's a SQL function like CURRENT_TIMESTAMP
      if (value.toUpperCase().match(/^(CURRENT_TIMESTAMP|NOW\(\)|GETDATE\(\))$/)) {
        return value;
      }
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }
}
