import { ConnectionType } from '@/lib/db/types'

// --- DBeaver config file structures ---

export interface DBeaverDataSources {
  folders: Record<string, unknown>
  connections: Record<string, DBeaverConnection>
}

export interface DBeaverConnection {
  provider: string
  driver: string
  name: string
  'save-password': boolean
  'read-only': boolean
  configuration: {
    host?: string
    port?: string
    database?: string
    url?: string
    type?: string
    handlers?: Record<string, DBeaverHandler>
    'provider-properties'?: Record<string, string>
  }
}

export interface DBeaverHandler {
  type: string
  enabled: boolean
  properties?: Record<string, string>
}

// --- Parsed output structures ---

export interface DBeaverInstallation {
  path: string
  edition: string
  hasDataSources: boolean
  hasScripts: boolean
}

export interface ParsedConnection {
  dbeaverId: string
  name: string
  connectionType: ConnectionType | null
  host: string | null
  port: number | null
  defaultDatabase: string | null
  username: string | null
  password: string | null
  readOnlyMode: boolean
  sshEnabled: boolean
  sshHost: string | null
  sshPort: number | null
  sshUsername: string | null
  sshPassword: string | null
  sshKeyfile: string | null
  sshMode: null | 'agent' | 'userpass' | 'keyfile'
  ssl: boolean
  sslCaFile: string | null
  sslCertFile: string | null
  sslKeyFile: string | null
  unsupportedDriver: string | null
}

export interface ParsedQuery {
  title: string
  text: string
  associatedConnectionId: string | null
}

export interface ImportResult {
  importedConnections: number
  importedQueries: number
  errors: string[]
}

// --- Driver mapping ---

const DRIVER_MAP: Record<string, ConnectionType> = {
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  oracle_thin: 'oracle',
  oracle: 'oracle',
  sqlserver: 'sqlserver',
  mssql: 'sqlserver',
  sqlite: 'sqlite',
  clickhouse: 'clickhouse',
  mongodb: 'mongodb',
  firebird: 'firebird',
  cockroachdb: 'cockroachdb',
  redshift: 'redshift',
  cassandra: 'cassandra',
  duckdb: 'duckdb',
  tidb: 'tidb',
  bigquery: 'bigquery',
  trino: 'trino',
  presto: 'trino',
  sqlanywhere: 'sqlanywhere',
}

export function mapDBeaverDriverToBKS(provider: string): ConnectionType | null {
  return DRIVER_MAP[provider] ?? null
}
