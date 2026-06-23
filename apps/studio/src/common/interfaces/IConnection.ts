import { AzureAuthOptions, BigQueryOptions, CassandraOptions, DynamoDBOptions, LibSQLOptions, RedshiftOptions, ConnectionType, SQLAnywhereOptions, IamAuthOptions, SurrealDBOptions, SnowflakeOptions } from "@/lib/db/types"
import { Transport } from "../transport"
import { TransportConnectionSshConfig } from "../transport/TransportSshConfig"

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
    'surrealdb',
    'dynamodb',
    'snowflake'
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
  dynamoDbOptions?: DynamoDBOptions
  snowflakeOptions?: SnowflakeOptions
  connectionFolderId?: Nullable<number>
  position?: number
}

export interface IConnection extends ISimpleConnection {
  name: Nullable<string>
  password: Nullable<string>

  /** Ordered list of SSH hop configs (jump hosts + target host), sorted by position ascending */
  sshConfigs?: TransportConnectionSshConfig[]

  /** When false, the client must NOT send keyfilePassword on sshConfigs to the cloud API. */
  sshStoreKeyfilePassword?: boolean
}

export interface ICloudSavedConnection extends IConnection {
  userSpecificCredentials: boolean
  userSpecificPaths: boolean
}
