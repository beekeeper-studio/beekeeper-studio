import { AzureAuthOptions, BigQueryOptions, CassandraOptions, LibSQLOptions, RedshiftOptions, ConnectionType, SQLAnywhereOptions, IamAuthOptions, SurrealDBOptions } from "@/lib/db/types"
import { Transport } from "../transport"

export type SshMode = null | 'agent' | 'userpass' | 'keyfile'

export function isUltimateType(s: ConnectionType) {
  const types: ConnectionType[] = [
    'oracle',
    'firebird',
    'cassandra',
    'libsql',
    'duckdb',
    'clickhouse',
    'mongodb',
    'sqlanywhere',
    'trino',
    'surrealdb'
  ]
  return types.includes(s)
}


export interface ISimpleConnection extends Transport {
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
  url: Nullable<string>
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
  iamAuthOptions?: IamAuthOptions
  cassandraOptions?: CassandraOptions
  bigQueryOptions?: BigQueryOptions
  azureAuthOptions?: AzureAuthOptions
  authId?: number
  libsqlOptions?: LibSQLOptions
  sqlAnywhereOptions?: SQLAnywhereOptions
  surrealDbOptions?: SurrealDBOptions
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
