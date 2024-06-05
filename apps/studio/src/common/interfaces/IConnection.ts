import { AzureAuthOptions, LibSQLOptions, RedshiftOptions } from "../appdb/models/saved_connection"
import { BigQueryOptions } from "../appdb/models/saved_connection"
import { CassandraOptions } from "../appdb/models/saved_connection"

const ConnectionTypes = ['sqlite', 'sqlserver', 'redshift', 'cockroachdb', 'mysql', 'postgresql', 'mariadb', 'cassandra', 'oracle', 'bigquery', 'firebird', 'tidb', 'libsql'] as const
export type ConnectionType = typeof ConnectionTypes[number]
export type SshMode = null | 'agent' | 'userpass' | 'keyfile'

export function isUltimateType(s: ConnectionType) {
  const types: ConnectionType[] = [
    'oracle',
    'firebird',
    'cassandra',
    'libsql',
  ]
  return types.includes(s)
}


export interface ISimpleConnection {
  id: number | null
  workspaceId: Nullable<number>
  connectionType: ConnectionType
  host: Nullable<string>
  port: Nullable<number>
  socketPath: Nullable<string>
  socketPathEnabled: boolean
  username: Nullable<string>
  domain: Nullable<string>
  defaultDatabase: Nullable<string>
  uri: Nullable<string>
  sshEnabled: boolean
  sshHost: Nullable<string>
  sshPort: Nullable<number>
  sshKeyfile: Nullable<string>
  sshUsername: Nullable<string>
  sshBastionHost: Nullable<string>
  sshKeepaliveInterval: Nullable<number>
  ssl: boolean
  sslCaFile: Nullable<string>
  sslCertFile: Nullable<string>
  sslKeyFile: Nullable<string>
  sslRejectUnauthorized: boolean
  readOnlyMode: boolean
  labelColor?: Nullable<string>
  trustServerCertificate?: boolean
  serviceName: Nullable<string>
  options?: any
  redshiftOptions?: RedshiftOptions
  cassandraOptions?: CassandraOptions
  bigQueryOptions?: BigQueryOptions
  azureAuthOptions?: AzureAuthOptions
  authId?: number
  libsqlOptions?: LibSQLOptions
}

export interface IConnection extends ISimpleConnection {
  name: Nullable<string>

  sshMode: SshMode
  password: Nullable<string>
  sshPassword: Nullable<string>
  sshKeyfilePassword: Nullable<string>
}

export interface ICloudSavedConnection extends IConnection {
  userSpecificCredentials: boolean
  userSpecificPaths: boolean
}
