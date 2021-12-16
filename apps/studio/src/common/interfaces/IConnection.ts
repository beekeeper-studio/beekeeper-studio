
export type ConnectionType = 'sqlite' | 'sqlserver' | 'redshift' | 'cockroachdb' | 'mysql' | 'postgresql' | 'mariadb' | 'cassandra'
export type SshMode = null | 'agent' | 'userpass' | 'keyfile'

export interface ISimpleConnection {
  id: number | null
  workspaceId: Nullable<number>
  connectionType: ConnectionType
  host: Nullable<string>
  port: Nullable<number>
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
  ssl: boolean
  sslCaFile: Nullable<string>
  sslCertFile: Nullable<string>
  sslKeyFile: Nullable<string>
  sslRejectUnauthorized: boolean
  labelColor?: Nullable<string>
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