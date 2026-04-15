// Copyright (c) 2025 Beekeeper Studio Team

import { IBasicDatabaseClient } from '../db/types';
import { TableDependency } from './types';
import { DependencyResolver } from './DependencyResolver';
import log from 'electron-log/renderer';

export interface DataMigrationOptions {
  batchSize?: number;
  disableForeignKeys?: boolean;
  onProgress?: (progress: DataMigrationProgress) => void;
}

export interface DataMigrationProgress {
  table: string;
  schema?: string;
  rowsMigrated: number;
  totalRows: number;
}

export class DataMigrator {
  constructor(
    private sourceClient: IBasicDatabaseClient,
    private targetClient: IBasicDatabaseClient
  ) {}

  /**
   * Migrates data from source to target following dependency order
   */
  async migrateData(
    dependencies: TableDependency[],
    options: DataMigrationOptions = {}
  ): Promise<void> {
    const batchSize = options.batchSize || 1000;
    
    try {
      // Disable foreign key checks if requested
      if (options.disableForeignKeys) {
        await this.disableForeignKeyChecks(this.targetClient);
      }

      // Resolve dependencies to get migration order
      const migrationOrder = DependencyResolver.resolveDependencies(dependencies);

      // Migrate each table in order
      for (const { table, schema } of migrationOrder) {
        await this.migrateTable(table, schema, batchSize, options.onProgress);
      }

      // Re-enable foreign key checks
      if (options.disableForeignKeys) {
        await this.enableForeignKeyChecks(this.targetClient);
      }
    } catch (error) {
      log.error('Error migrating data:', error);
      
      // Try to re-enable foreign keys even if migration fails
      if (options.disableForeignKeys) {
        try {
          await this.enableForeignKeyChecks(this.targetClient);
        } catch (fkError) {
          log.error('Error re-enabling foreign key checks:', fkError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Migrates data for a single table
   */
  private async migrateTable(
    tableName: string,
    schemaName: string | undefined,
    batchSize: number,
    onProgress?: (progress: DataMigrationProgress) => void
  ): Promise<void> {
    try {
      log.info(`Migrating data for table: ${schemaName ? schemaName + '.' : ''}${tableName}`);

      // Get total row count
      const countQuery = this.buildCountQuery(tableName, schemaName);
      const countResult = await this.sourceClient.executeQuery(countQuery);
      const totalRows = countResult[0]?.rows?.[0]?.[0] || 0;

      if (totalRows === 0) {
        log.info(`Table ${tableName} is empty, skipping data migration`);
        return;
      }

      // Get column information
      const columns = await this.sourceClient.listTableColumns(tableName, schemaName);
      const columnNames = columns.map(col => col.columnName);

      let offset = 0;
      let rowsMigrated = 0;

      // Migrate in batches
      while (offset < totalRows) {
        // Read batch from source
        const selectQuery = this.buildSelectQuery(tableName, schemaName, columnNames, batchSize, offset);
        const sourceData = await this.sourceClient.executeQuery(selectQuery);
        
        if (!sourceData[0]?.rows || sourceData[0].rows.length === 0) {
          break;
        }

        const rows = sourceData[0].rows;

        // Insert batch into target
        const insertQuery = this.buildBatchInsertQuery(tableName, schemaName, columnNames, rows);
        await this.targetClient.executeQuery(insertQuery);

        rowsMigrated += rows.length;
        offset += batchSize;

        // Report progress
        if (onProgress) {
          onProgress({
            table: tableName,
            schema: schemaName,
            rowsMigrated,
            totalRows
          });
        }

        log.info(`Migrated ${rowsMigrated}/${totalRows} rows for ${tableName}`);
      }

      log.info(`Completed migration for table ${tableName}: ${rowsMigrated} rows`);
    } catch (error) {
      log.error(`Error migrating table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Builds COUNT query
   */
  private buildCountQuery(tableName: string, schemaName?: string): string {
    const fullTableName = schemaName ? `${this.quote(schemaName)}.${this.quote(tableName)}` : this.quote(tableName);
    return `SELECT COUNT(*) FROM ${fullTableName}`;
  }

  /**
   * Builds SELECT query with pagination
   */
  private buildSelectQuery(
    tableName: string,
    schemaName: string | undefined,
    columnNames: string[],
    limit: number,
    offset: number
  ): string {
    const fullTableName = schemaName ? `${this.quote(schemaName)}.${this.quote(tableName)}` : this.quote(tableName);
    const columns = columnNames.map(col => this.quote(col)).join(', ');
    return `SELECT ${columns} FROM ${fullTableName} LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Builds batch INSERT query
   */
  private buildBatchInsertQuery(
    tableName: string,
    schemaName: string | undefined,
    columnNames: string[],
    rows: any[]
  ): string {
    const fullTableName = schemaName ? `${this.quote(schemaName)}.${this.quote(tableName)}` : this.quote(tableName);
    const columns = columnNames.map(col => this.quote(col)).join(', ');
    
    const values = rows.map(row => {
      const rowValues = Array.isArray(row) 
        ? row.map(val => this.escapeValue(val))
        : columnNames.map(col => this.escapeValue(row[col]));
      return `(${rowValues.join(', ')})`;
    }).join(',\n  ');

    return `INSERT INTO ${fullTableName} (${columns}) VALUES\n  ${values}`;
  }

  /**
   * Disables foreign key checks (database-specific)
   */
  private async disableForeignKeyChecks(client: IBasicDatabaseClient): Promise<void> {
    const connectionType = client.connectionType;
    
    try {
      switch (connectionType) {
        case 'mysql':
        case 'mariadb':
          await client.executeQuery('SET FOREIGN_KEY_CHECKS = 0');
          break;
        case 'postgresql':
        case 'redshift':
        case 'cockroachdb':
          // PostgreSQL doesn't have a global setting, but we can defer constraints
          await client.executeQuery('SET CONSTRAINTS ALL DEFERRED');
          break;
        case 'sqlserver':
          // SQL Server requires individual table disabling, handled per table
          break;
        case 'sqlite':
          await client.executeQuery('PRAGMA foreign_keys = OFF');
          break;
        default:
          log.warn(`Foreign key disabling not implemented for ${connectionType}`);
      }
    } catch (error) {
      log.warn(`Error disabling foreign key checks: ${error.message}`);
    }
  }

  /**
   * Enables foreign key checks (database-specific)
   */
  private async enableForeignKeyChecks(client: IBasicDatabaseClient): Promise<void> {
    const connectionType = client.connectionType;
    
    try {
      switch (connectionType) {
        case 'mysql':
        case 'mariadb':
          await client.executeQuery('SET FOREIGN_KEY_CHECKS = 1');
          break;
        case 'postgresql':
        case 'redshift':
        case 'cockroachdb':
          await client.executeQuery('SET CONSTRAINTS ALL IMMEDIATE');
          break;
        case 'sqlite':
          await client.executeQuery('PRAGMA foreign_keys = ON');
          break;
        default:
          log.warn(`Foreign key enabling not implemented for ${connectionType}`);
      }
    } catch (error) {
      log.warn(`Error enabling foreign key checks: ${error.message}`);
    }
  }

  /**
   * Quote identifier
   */
  private quote(identifier: string): string {
    return `\`${identifier}\``;
  }

  /**
   * Escape value for SQL
   */
  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    
    return String(value);
  }
}
