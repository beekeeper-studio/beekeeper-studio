import type { SSHConnection } from '@/vendor/node-ssh-forward/index';
import type { RedshiftOptions, BigQueryOptions } from '@/common/appdb/models/saved_connection';
import { BasicDatabaseClient } from './clients/BasicDatabaseClient';

export type ConnectionType = 'sqlite' | 'sqlserver' | 'redshift' | 'cockroachdb' | 'mysql' | 'postgresql' | 'mariadb' | 'cassandra' | 'bigquery' | 'firebird'

export enum DatabaseElement {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  "MATERIALIZED-VIEW" = 'MATERIALIZED VIEW',
  DATABASE = 'DATABASE'
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
    // TODO (@day): this is a circular dependency issue most likely
    [x: string]: BasicDatabaseClient<any>
  },
  sshTunnel?: Nullable<IDbSshTunnel>,
  config: IDbConnectionServerConfig,
}
