import type { SSHConnection } from '@/vendor/node-ssh-forward/index';
import type { RedshiftOptions, BigQueryOptions, CassandraOptions, AzureAuthOptions, LibSQLOptions } from '@/common/appdb/models/saved_connection';
import { BasicDatabaseClient } from './clients/BasicDatabaseClient';
import { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from './models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';

export type ConnectionType = 'sqlite' | 'sqlserver' | 'redshift' | 'cockroachdb' | 'mysql' | 'postgresql' | 'mariadb' | 'cassandra' | 'bigquery' | 'firebird' | 'oracle' | 'tidb' | 'libsql';

export enum DatabaseElement {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  "MATERIALIZED-VIEW" = 'MATERIALIZED VIEW',
  DATABASE = 'DATABASE',
  SCHEMA = 'SCHEMA'
}

export interface IDbConnectionDatabase {
  database: string,
  connected: Nullable<boolean>,
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
  client: Nullable<ConnectionType>,
  host?: string,
  port: Nullable<number>,
  domain: Nullable<string>,
  serviceName?: string, // Oracle
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
  readOnlyMode: boolean,
  localHost?: string,
  localPort?: number,
  trustServerCertificate?: boolean
  instantClientLocation?: string
  oracleConfigLocation?: string
  options?: any
  redshiftOptions?: RedshiftOptions
  cassandraOptions?: CassandraOptions
  bigQueryOptions?: BigQueryOptions
  azureAuthOptions?: AzureAuthOptions
  authId?: number
  libsqlOptions?: LibSQLOptions
  runtimeExtensions?: string[]
}

export interface IDbSshTunnel {
  connection: SSHConnection,
  localHost: string,
  localPort: number,
  tunnel: Record<string, any>
}

export interface IDbConnectionServer {
  db: {
    [x: string]: BasicDatabaseClient<any>
  },
  sshTunnel?: Nullable<IDbSshTunnel>,
  config: IDbConnectionServerConfig,
}

export interface IBasicDatabaseClient {
  supportedFeatures(): Promise<SupportedFeatures>
  versionString(): Promise<string>,
  defaultSchema(): Promise<string | null>,
  listCharsets(): Promise<string[]>,
  getDefaultCharset(): Promise<string>,
  listCollations(charset: string): Promise<string[]>,

  connect(): Promise<void>,
  disconnect(): Promise<void>,

  listTables(filter?: FilterOptions): Promise<TableOrView[]>,
  listViews(filter?: FilterOptions): Promise<TableOrView[]>,
  listRoutines(filter?: FilterOptions): Promise<Routine[]>,
  listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]>,
  listTableColumns(table: string, schema?: string): Promise<ExtendedTableColumn[]>,
  listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]>,
  listTableIndexes(table: string, schema?: string): Promise<TableIndex[]>,
  listSchemas(filter?: SchemaFilterOptions): Promise<string[]>,
  getTableReferences(table: string, schema?: string): Promise<string[]>,
  getTableKeys(table: string, schema?: string): Promise<TableKey[]>,
  listTablePartitions(table: string, schema?: string): Promise<TablePartition[]>,
  query(queryText: string, options?: any): Promise<CancelableQuery>,
  executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]>,
  listDatabases(filter?: DatabaseFilterOptions): Promise<string[]>,
  getTableProperties(table: string, schema?: string): Promise<TableProperties | null>,
  getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string>,
  listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]>,
  getPrimaryKey(table: string, schema?: string): Promise<string | null>,
  getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]>;

  createDatabase(databaseName: string, charset: string, collation: string): Promise<void>,
  createDatabaseSQL(): Promise<string>,
  getTableCreateScript(table: string, schema?: string): Promise<string>,
  getViewCreateScript(view: string, schema?: string): Promise<string[]>,
  getMaterializedViewCreateScript(view: string, schema?: string): Promise<string[]>,
  getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]>,

  alterTableSql(change: AlterTableSpec): Promise<string>,
  alterTable(change: AlterTableSpec): Promise<void>,
  alterIndexSql(changes: IndexAlterations): Promise<string | null>,
  alterIndex(changes: IndexAlterations): Promise<void>,
  alterRelationSql(changes: RelationAlterations): Promise<string | null>
  alterRelation(changes: RelationAlterations): Promise<void>,
  alterPartitionSql(changes: AlterPartitionsSpec): Promise<string | null>,
  alterPartition(changes: AlterPartitionsSpec): Promise<void>,

  applyChangesSql(changes: TableChanges): Promise<string>,
  applyChanges(changes: TableChanges): Promise<TableUpdateResult[]>,
  setTableDescription(table: string, description: string, schema?: string): Promise<string>
  dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>,
  truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>,
  truncateAllTables(schema?: string): Promise<void>


  getTableLength(table: string, schema?: string): Promise<number>,
  selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult>,
  selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string>,
  selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> 

  queryStream(query: string, chunkSize: number): Promise<StreamResults>

  duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void>
  duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string>

  getInsertQuery(tableInsert: TableInsert, asUpsert?: Boolean): Promise<string>
  syncDatabase(): Promise<void>
}
