import { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, ImportFuncOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from './models';
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';

export const DatabaseTypes = ['sqlite', 'sqlserver', 'redshift', 'cockroachdb', 'mysql', 'postgresql', 'mariadb', 'cassandra', 'oracle', 'bigquery', 'firebird', 'tidb', 'libsql', 'clickhouse', 'duckdb', 'mongodb'] as const
export type ConnectionType = typeof DatabaseTypes[number]

export const ConnectionTypes = [
  { name: 'MySQL', value: 'mysql' },
  { name: 'TiDB', value: 'tidb' },
  { name: 'MariaDB', value: 'mariadb' },
  { name: 'Postgres', value: 'postgresql' },
  { name: 'SQLite', value: 'sqlite' },
  { name: 'LibSQL', value: 'libsql' },
  { name: 'SQL Server', value: 'sqlserver' },
  { name: 'Amazon Redshift', value: 'redshift' },
  { name: 'CockroachDB', value: 'cockroachdb' },
  { name: 'Oracle', value: 'oracle' },
  { name: 'Cassandra', value: 'cassandra' },
  { name: 'BigQuery', value: 'bigquery' },
  { name: 'Firebird', value: 'firebird'},
  { name: 'DuckDB', value: 'duckdb' },
  { name: 'ClickHouse', value: 'clickhouse' },
  { name: 'MongoDB', value: 'mongodb' }
]

/** `value` should be recognized by codemirror */
export const keymapTypes = [
  { name: "Default", value: "default" },
  { name: "Vim", value: "vim" }
] as const

// if you update this, you may need to update `translateOperator` in the mongodb driver
export const TableFilterSymbols = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'does not equal'},
  { value: 'like', label: 'like' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less than or equal' },
  { value: '>', label: 'greater than'},
  { value: ">=", label: "greater than or equal" },
  { value: "in", label: 'in', arrayInput: true },
  { value: "is", label: "is null", nullOnly: true },
  { value: "is not", label: "is not null", nullOnly: true }
]

export enum AzureAuthType {
  Default, // This actually may not work at all, might need to just give up on it
  Password,
  AccessToken,
  MSIVM,
  ServicePrincipalSecret
}

export const IamAuthTypes = [
  { name: 'IAM Authentication Using Access Key and Secret Key', value: 'iam_key' },
  { name: 'IAM Authentication Using Credentials File', value: 'iam_file' }
]

// supported auth types that actually work :roll_eyes: default i'm looking at you
export const AzureAuthTypes = [
  // Can't have 2FA, kinda redundant now
  // { name: 'Password', value: AzureAuthType.Password },
  { name: 'Azure AD SSO', value: AzureAuthType.AccessToken },
  // This may be reactivated when we move to client server architecture
  // { name: 'MSI VM', value: AzureAuthType.MSIVM },
  { name: 'Azure Service Principal Secret', value: AzureAuthType.ServicePrincipalSecret }
];

export interface RedshiftOptions {
  awsProfile?: string
  iamAuthenticationEnabled?: boolean
  accessKeyId?: string;
  secretAccessKey?: string;
  awsRegion?: string;
  clusterIdentifier?: string;
  databaseGroup?: string;
  tokenDurationSeconds?: number;
  isServerless?: boolean;
  authType?: string;
}

export interface CassandraOptions {
  localDataCenter?: string
}

export interface BigQueryOptions {
  keyFilename?: string;
  projectId?: string;
  devMode?: boolean
}

export interface AzureAuthOptions {
  azureAuthEnabled?: boolean;
  azureAuthType?: AzureAuthType;
  tenantId?: string;
  clientSecret?: string;
  msiEndpoint?: string;
}
export interface LibSQLOptions {
  mode: 'url' | 'file';
  authToken?: string;
  syncUrl?: string;
  syncPeriod?: number;
}

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
  url?: string,
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
  setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void>,
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

  getInsertQuery(tableInsert: TableInsert, runAsUpsert?: boolean): Promise<string>
  syncDatabase(): Promise<void>

  importStepZero(table: TableOrView): Promise<any>
  importBeginCommand(table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
  importTruncateCommand (table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
  importLineReadCommand (table: TableOrView, sqlString: string|string[], importOptions?: ImportFuncOptions): Promise<any>
  importCommitCommand (table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
  importRollbackCommand (table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
  importFinalCommand (table: TableOrView, importOptions?: ImportFuncOptions): Promise<any>
}
