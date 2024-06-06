import type { SSHConnection } from '@/vendor/node-ssh-forward/index';
import type { RedshiftOptions, BigQueryOptions, CassandraOptions, AzureAuthOptions, LibSQLOptions } from '@/common/appdb/models/saved_connection';
import { BasicDatabaseClient } from './clients/BasicDatabaseClient';

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
