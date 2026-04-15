// Copyright (c) 2026 Beekeeper Studio Team
// For support issues with this feature, contact @quinnjr on GitHub

export enum MigrationType {
  SCHEMA_ONLY = 'schema_only',
  DATA_ONLY = 'data_only',
  SCHEMA_AND_DATA = 'schema_and_data'
}

export enum MigrationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface MigrationConfig {
  sourceConnectionId: number;
  targetConnectionId: number;
  migrationType: MigrationType;
  tables?: string[]; // If empty, migrate all tables
  dropExisting?: boolean; // Drop existing tables/data before migration
  disableForeignKeys?: boolean; // Temporarily disable foreign keys during migration
  batchSize?: number; // Number of rows to migrate at once
}

export interface TableDependency {
  table: string;
  schema?: string;
  dependsOn: Array<{ table: string; schema?: string }>;
}

export interface MigrationProgress {
  status: MigrationStatus;
  currentTable?: string;
  currentStep?: string;
  tablesCompleted: number;
  totalTables: number;
  rowsMigrated: number;
  totalRows?: number;
  errors: MigrationError[];
  startTime: Date;
  endTime?: Date;
}

export interface MigrationError {
  table: string;
  error: string;
  timestamp: Date;
}

export interface TableMigrationInfo {
  name: string;
  schema?: string;
  rowCount: number;
  dependencies: string[];
  migrated: boolean;
}

export interface SchemaInfo {
  tables: TableSchema[];
  dependencies: TableDependency[];
}

export interface TableSchema {
  name: string;
  schema?: string;
  columns: ColumnSchema[];
  primaryKeys: string[];
  foreignKeys: ForeignKeySchema[];
  indexes: IndexSchema[];
  triggers?: TriggerSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  comment?: string;
}

export interface ForeignKeySchema {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedSchema?: string;
  referencedColumns: string[];
  onUpdate?: string;
  onDelete?: string;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface TriggerSchema {
  name: string;
  timing: string;
  event: string;
  statement: string;
}
