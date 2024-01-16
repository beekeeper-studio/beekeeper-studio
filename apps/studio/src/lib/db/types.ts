import type { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations } from "@shared/lib/dialects/models";
import type { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from "./models";
import type { SSHConnection } from '@/vendor/node-ssh-forward/index';
import type { RedshiftOptions, BigQueryOptions } from '@/common/appdb/models/saved_connection';
import type { default as mysql } from './clients/mysql'
import type { default as postgresql } from './clients/postgresql'
import type { default as sqlserver } from './clients/sqlserver'
import type { default as sqlite } from './clients/sqlite'
import type { default as cassandra } from './clients/cassandra'
import type { default as mariadb } from './clients/mariadb'
import type { default as bigquery } from './clients/bigquery'

export interface DBClientFactories {
  mysql: typeof mysql
  postgresql: typeof postgresql
  sqlserver: typeof sqlserver
  sqlite: typeof sqlite
  cassandra: typeof cassandra
  redshift: typeof postgresql
  mariadb: typeof mariadb
  cockroachdb: typeof postgresql
  bigquery: typeof bigquery
}

export enum DatabaseElement {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  "MATERIALIZED-VIEW" = 'MATERIALIZED VIEW',
  DATABASE = 'DATABASE'
}

export interface IDbConnectionDatabase {
  database: string,
  connection: Nullable<DatabaseClient>,
  connecting: boolean,
}

export interface IDbConnectionServerSSHConfig {
  host: Nullable<string>
  port: number
  user: Nullable<string>
  password: Nullable<string>
  privateKey: Nullable<string>
  passphrase: Nullable<string>
  bastionHost: Nullable<string>
  keepaliveInterval: number
  useAgent: boolean
}

export interface IDbConnectionServerConfig {
  client: Nullable<keyof DBClientFactories>,
  host?: string,
  port: Nullable<number>,
  domain: Nullable<string>,
  socketPath: Nullable<string>,
  socketPathEnabled: boolean,
  user: Nullable<string>,
  osUser: string,
  password: Nullable<string>,
  ssh: Nullable<IDbConnectionServerSSHConfig>,
  sslCaFile: Nullable<string>,
  sslCertFile: Nullable<string>,
  sslKeyFile: Nullable<string>,
  sslRejectUnauthorized: boolean,
  ssl: boolean
  localHost?: string,
  localPort?: number,
  trustServerCertificate?: boolean
  options?: any
  redshiftOptions?: RedshiftOptions
  bigQueryOptions?: BigQueryOptions
}

export interface IDbSshTunnel {
  connection: SSHConnection,
  localHost: string,
  localPort: number,
  tunnel: Record<string, any>
}

export interface IDbConnectionServer {
  db: {
    [x: string]: DatabaseClient
  },
  sshTunnel?: Nullable<IDbSshTunnel>,
  config: IDbConnectionServerConfig,
}

export interface DatabaseClient {
  supportedFeatures: () => SupportedFeatures,
  versionString: () => string,
  defaultSchema?: () => string,
  disconnect: () => void,
  listTables: (db: string, filter?: FilterOptions) => Promise<TableOrView[]>,
  listViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  listRoutines: (filter?: FilterOptions) => Promise<Routine[]>,
  listMaterializedViewColumns: (db: string, table: string, schema?: string) => Promise<TableColumn[]>
  listTableColumns: (db: string, table?: string, schema?: string) => Promise<ExtendedTableColumn[]>,
  listTableTriggers: (table: string, schema?: string) => Promise<TableTrigger[]>,
  listTableIndexes: (db: string, table: string, schema?: string) => Promise<TableIndex[]>,
  listSchemas: (db: string, filter?: SchemaFilterOptions) => Promise<string[]>,
  listTablePartitions: (table: string, schema?: string) => Promise<TablePartition[]>
  getTableReferences: (table: string, schema?: string) => void,
  getTableKeys: (db: string, table: string, schema?: string) => void,
  query: (queryText: string) => CancelableQuery,
  executeQuery: (queryText: string) => void,

  // create database
  listCharsets: () => Promise<string[]>,
  getDefaultCharset: () => Promise<string>,
  listCollations: (charset?: string) => Promise<string[]>,
  createDatabase: (databaseName: string, charset: string, collation: string) => void,

  listDatabases: (filter?: DatabaseFilterOptions) => Promise<string[]>,
  applyChanges: (changes: TableChanges) => Promise<TableUpdateResult[]>,
  // alter table
  alterTableSql: (change: AlterTableSpec) => Promise<string>,
  alterTable: (change: AlterTableSpec) => Promise<void>,

  alterIndexSql: (changes: IndexAlterations) => string | null
  alterIndex: (changes: IndexAlterations) => Promise<void>,

  alterRelationSql: (changes: RelationAlterations) => string | null
  alterRelation: (changes: RelationAlterations) => Promise<void>

  alterPartitionSql: (changes: AlterPartitionsSpec) => string | null,
  alterPartition: (changes: AlterPartitionsSpec) => Promise<void>,

  applyChangesSql: (changes: TableChanges) => string,
  getInsertQuery: (tableInsert: TableInsert) => Promise<string>,
  getQuerySelectTop: (table: string, limit: number, schema?: string) => void,
  getTableProperties: (table: string, schema?: string) => Promise<TableProperties | null>,
  getTableCreateScript: (table: string, schema?: string) => Promise<string>,
  getViewCreateScript: (view: string) => void,
  getMaterializedViewCreateScript?: (view: string) => Promise<string[]>,
  getRoutineCreateScript: (routine: string, type: string, schema?: string) => void,
  truncateAllTables: (db: string, schema?: string) => void,
  listMaterializedViews: (filter?: FilterOptions) => Promise<TableOrView[]>,
  getPrimaryKey: (db: string, table: string, schema?: string) => Promise<string | null>,
  getPrimaryKeys: (db: string, table: string, schema?: string) => Promise<PrimaryKeyColumn[]>,
  // for tabletable
  getTableLength(table: string, schema?: string): Promise<number>
  selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: TableFilter[] | string, schema?: string, selects?: string[]): Promise<TableResult>,
  selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: TableFilter[] | string, chunkSize: number, schema?: string ): Promise<StreamResults>,
  selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: TableFilter[] | string, schema?: string, selects?: string[]): Promise<string>,

  // for export
  queryStream(db: string, query: string, chunkSize: number ): Promise<StreamResults>,

  wrapIdentifier: (value: string) => string
  setTableDescription: (table: string, description: string, schema?: string) => Promise<string>

  // delete stuff
  dropElement: (elementName: string, typeOfElement: DatabaseElement, schema?: string) => Promise<void>
  truncateElement: (elementName: string, typeOfElement: DatabaseElement, schema?: string) => Promise<void>

  // duplicate table
  duplicateTable: (tableName: string, duplicateTableName: string, schema?: string) => Promise<void>
  duplicateTableSql: (tableName: string, duplicateTableName: string, schema?: string) => string
}
