// Copyright (c) 2026 Beekeeper Studio Team

import { IBasicDatabaseClient } from '../db/types';
import { 
  MigrationConfig, 
  MigrationProgress, 
  MigrationStatus, 
  MigrationType,
  MigrationError,
  TableSchema
} from './types';
import { SchemaExtractor } from './SchemaExtractor';
import { DataMigrator } from './DataMigrator';
import { DependencyResolver } from './DependencyResolver';
import log from 'electron-log/renderer';
import { EventEmitter } from 'events';

export class MigrationService extends EventEmitter {
  private progress: MigrationProgress;
  private cancelled = false;

  constructor(
    private sourceClient: IBasicDatabaseClient,
    private targetClient: IBasicDatabaseClient,
    private config: MigrationConfig
  ) {
    super();
    this.progress = {
      status: MigrationStatus.PENDING,
      tablesCompleted: 0,
      totalTables: 0,
      rowsMigrated: 0,
      errors: [],
      startTime: new Date()
    };
  }

  /**
   * Starts the migration process
   */
  async migrate(): Promise<MigrationProgress> {
    try {
      this.progress.status = MigrationStatus.IN_PROGRESS;
      this.progress.startTime = new Date();
      this.emitProgress();

      log.info('Starting migration...', this.config);

      // Extract schema from source
      this.updateProgress('Extracting schema from source database...');
      const schemaExtractor = new SchemaExtractor(this.sourceClient);
      const schemaInfo = await schemaExtractor.extractSchema(
        this.config.tables,
        await this.sourceClient.defaultSchema()
      );

      this.progress.totalTables = schemaInfo.tables.length;
      this.emitProgress();

      // Check if cancelled
      if (this.cancelled) {
        this.progress.status = MigrationStatus.CANCELLED;
        this.progress.endTime = new Date();
        this.emitProgress();
        return this.progress;
      }

      // Migrate schema if needed
      if (this.config.migrationType === MigrationType.SCHEMA_ONLY || 
          this.config.migrationType === MigrationType.SCHEMA_AND_DATA) {
        await this.migrateSchema(schemaInfo.tables, schemaExtractor);
        
        if (this.cancelled) {
          this.progress.status = MigrationStatus.CANCELLED;
          this.progress.endTime = new Date();
          this.emitProgress();
          return this.progress;
        }
      }

      // Migrate data if needed
      if (this.config.migrationType === MigrationType.DATA_ONLY || 
          this.config.migrationType === MigrationType.SCHEMA_AND_DATA) {
        await this.migrateData(schemaInfo);
        
        if (this.cancelled) {
          this.progress.status = MigrationStatus.CANCELLED;
          this.progress.endTime = new Date();
          this.emitProgress();
          return this.progress;
        }
      }

      // Migration completed successfully
      this.progress.status = MigrationStatus.COMPLETED;
      this.progress.endTime = new Date();
      this.emitProgress();

      log.info('Migration completed successfully');
      return this.progress;
    } catch (error) {
      log.error('Migration failed:', error);
      this.progress.status = MigrationStatus.FAILED;
      this.progress.endTime = new Date();
      this.progress.errors.push({
        table: this.progress.currentTable || 'unknown',
        error: error.message,
        timestamp: new Date()
      });
      this.emitProgress();
      throw error;
    }
  }

  /**
   * Migrates schema (tables, indexes, constraints)
   */
  private async migrateSchema(tables: TableSchema[], extractor: SchemaExtractor): Promise<void> {
    this.updateProgress('Migrating schema...');

    for (const tableSchema of tables) {
      if (this.cancelled) return;

      try {
        this.updateProgress(`Creating table ${tableSchema.name}...`, tableSchema.name);

        // Drop existing table if configured
        if (this.config.dropExisting) {
          await this.dropTableIfExists(tableSchema.name, tableSchema.schema);
        }

        // Create table
        const createTableSQL = this.adaptCreateTableSQL(
          extractor.generateCreateTableSQL(tableSchema, false), // Create without constraints first
          this.targetClient.connectionType
        );
        await this.targetClient.executeQuery(createTableSQL);

        // Create indexes
        const indexSQLs = extractor.generateIndexSQL(tableSchema);
        for (const indexSQL of indexSQLs) {
          try {
            const adaptedSQL = this.adaptSQL(indexSQL, this.targetClient.connectionType);
            await this.targetClient.executeQuery(adaptedSQL);
          } catch (error) {
            log.warn(`Error creating index: ${error.message}`);
            // Continue with other indexes
          }
        }

        this.progress.tablesCompleted++;
        this.emitProgress();
      } catch (error) {
        log.error(`Error creating table ${tableSchema.name}:`, error);
        this.progress.errors.push({
          table: tableSchema.name,
          error: `Schema migration error: ${error.message}`,
          timestamp: new Date()
        });
        throw error;
      }
    }

    // Create foreign keys after all tables are created
    if (this.cancelled) return;
    
    this.updateProgress('Creating foreign key constraints...');
    for (const tableSchema of tables) {
      if (this.cancelled) return;

      if (tableSchema.foreignKeys.length > 0) {
        const fkSQLs = extractor.generateForeignKeySQL(tableSchema);
        for (const fkSQL of fkSQLs) {
          try {
            const adaptedSQL = this.adaptSQL(fkSQL, this.targetClient.connectionType);
            await this.targetClient.executeQuery(adaptedSQL);
          } catch (error) {
            log.warn(`Error creating foreign key: ${error.message}`);
            this.progress.errors.push({
              table: tableSchema.name,
              error: `Foreign key creation warning: ${error.message}`,
              timestamp: new Date()
            });
            // Continue with other foreign keys
          }
        }
      }
    }
  }

  /**
   * Migrates data
   */
  private async migrateData(schemaInfo: any): Promise<void> {
    this.updateProgress('Migrating data...');

    const dataMigrator = new DataMigrator(this.sourceClient, this.targetClient);

    await dataMigrator.migrateData(schemaInfo.dependencies, {
      batchSize: this.config.batchSize || 1000,
      disableForeignKeys: this.config.disableForeignKeys !== false, // Default to true
      onProgress: (dataProgress) => {
        if (this.cancelled) return;
        
        this.progress.currentTable = dataProgress.table;
        this.progress.rowsMigrated = dataProgress.rowsMigrated;
        this.progress.totalRows = dataProgress.totalRows;
        this.updateProgress(
          `Migrating data for ${dataProgress.table}: ${dataProgress.rowsMigrated}/${dataProgress.totalRows} rows`,
          dataProgress.table
        );
      }
    });

    this.progress.tablesCompleted = schemaInfo.tables.length;
    this.emitProgress();
  }

  /**
   * Drops table if it exists
   */
  private async dropTableIfExists(tableName: string, schemaName?: string): Promise<void> {
    const fullTableName = schemaName ? `${this.quote(schemaName)}.${this.quote(tableName)}` : this.quote(tableName);
    
    try {
      await this.targetClient.executeQuery(`DROP TABLE IF EXISTS ${fullTableName} CASCADE`);
    } catch (error) {
      log.warn(`Error dropping table ${tableName}: ${error.message}`);
      // Try without CASCADE for databases that don't support it
      try {
        await this.targetClient.executeQuery(`DROP TABLE IF EXISTS ${fullTableName}`);
      } catch (error2) {
        log.warn(`Error dropping table ${tableName} (second attempt): ${error2.message}`);
      }
    }
  }

  /**
   * Adapts SQL for different database types
   */
  private adaptSQL(sql: string, targetType: string): string {
    // Replace backticks with appropriate quote character
    switch (targetType) {
      case 'postgresql':
      case 'redshift':
      case 'cockroachdb':
        return sql.replace(/`/g, '"');
      case 'sqlserver':
        return sql.replace(/`/g, '[]');
      case 'mysql':
      case 'mariadb':
      default:
        return sql;
    }
  }

  /**
   * Adapts CREATE TABLE SQL for different database types
   */
  private adaptCreateTableSQL(sql: string, targetType: string): string {
    let adapted = this.adaptSQL(sql, targetType);

    // Handle AUTO_INCREMENT differences
    switch (targetType) {
      case 'postgresql':
      case 'cockroachdb':
        adapted = adapted.replace(/AUTO_INCREMENT/gi, 'GENERATED BY DEFAULT AS IDENTITY');
        break;
      case 'sqlserver':
        adapted = adapted.replace(/AUTO_INCREMENT/gi, 'IDENTITY(1,1)');
        break;
      case 'sqlite':
        adapted = adapted.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
        break;
    }

    return adapted;
  }

  /**
   * Cancels the migration
   */
  cancel(): void {
    log.info('Migration cancelled by user');
    this.cancelled = true;
  }

  /**
   * Gets current progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Updates progress and emits event
   */
  private updateProgress(step: string, table?: string): void {
    this.progress.currentStep = step;
    if (table) {
      this.progress.currentTable = table;
    }
    this.emitProgress();
  }

  /**
   * Emits progress event
   */
  private emitProgress(): void {
    this.emit('progress', this.getProgress());
  }

  /**
   * Quote identifier
   */
  private quote(identifier: string): string {
    return `\`${identifier}\``;
  }
}
