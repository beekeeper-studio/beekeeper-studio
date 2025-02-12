import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm"
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { ConnectionString } from 'connection-string'
import log from '@bksLogger'
import { AzureCredsEncryptTransformer, EncryptTransformer } from '../transformers/Transformers'
import { IConnection, SshMode } from '@/common/interfaces/IConnection'
import { AzureAuthOptions, BigQueryOptions, CassandraOptions, ConnectionType, ConnectionTypes, LibSQLOptions, RedshiftOptions } from "@/lib/db/types"
import { resolveHomePathToAbsolute } from "@/handlers/utils"

const encrypt = new EncryptTransformer(loadEncryptionKey())
const azureEncrypt = new AzureCredsEncryptTransformer(loadEncryptionKey())

export interface ConnectionOptions {
  cluster?: string
  connectionMethod?: string
  connectionString?: string
}

function parseConnectionType(t: Nullable<ConnectionType>) {
  if (!t) return null

  const mapping: { [x: string]: ConnectionType } = {
    psql: 'postgresql',
    postgres: 'postgresql',
    mssql: 'sqlserver',
  }
  const allowed = ConnectionTypes.map(c => c.value)
  const result = mapping[t] || t
  if (!allowed.includes(result)) return null
  return result
}

export class DbConnectionBase extends ApplicationEntity {
  withProps(_props?: any): DbConnectionBase {
    return this;
  }

  _connectionType: Nullable<ConnectionType> = null

  @Column({ type: 'varchar', name: 'connectionType' })
  public set connectionType(value: Nullable<ConnectionType>) {
    if (this._connectionType !== value) {
      const changePort = this._port === this.defaultPort
      this._connectionType = parseConnectionType(value)
      this._port = changePort ? this.defaultPort : this._port
    }
  }

  public get connectionType() {
    return this._connectionType
  }

  @Column({ type: "varchar", nullable: true })
  host = 'localhost'

  _port: Nullable<number> = null

  @Column({ type: "int", nullable: true })
  public set port(v: Nullable<number>) {
    this._port = v
  }

  public get port(): Nullable<number> {
    return this._port
  }

  public get defaultPort() : Nullable<number> {
    let port
    switch (this.connectionType as string) {
      case 'mysql':
      case 'mariadb':
        port = 3306
        break
      case 'tidb':
        port = 4000
        break
      case 'postgresql':
        port = 5432
        break
      case 'sqlserver':
        port = 1433
        break
      case 'cockroachdb':
        port = 26257
        break
      case 'oracle':
        port = 1521
        break
      case 'cassandra':
        port = 9042
        break
      case 'bigquery':
        port = 443
        break
      case 'firebird':
        port = 3050
        break
      default:
        port = null
    }

    return port
  }

  _socketPath: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  public set socketPath(v: Nullable<string>) {
    this._socketPath = v
  }

  public get socketPath(): Nullable<string> {
    return this._socketPath || this.defaultSocketPath
  }

  public get defaultSocketPath(): Nullable<string> {
    if (['mysql', 'mariadb'].includes(this.connectionType || '')) {
      return '/var/run/mysqld/mysqld.sock'
    } else if (this.connectionType === 'postgresql') {
      return '/var/run/postgresql'
    } else if (this.connectionType === 'tidb') {
      return '/tmp/tidb.sock'
    }
    return null
  }

  @Column({ type: 'boolean', nullable: false, default: false })
  socketPathEnabled = false

  @Column({ type: "varchar", nullable: true })
  username: Nullable<string> = null

  @Column({ type: "varchar", nullable: true })
  domain: Nullable<string> = null

  @Column({ type: "varchar", nullable: true })
  defaultDatabase: Nullable<string> = null

  @Column({ type: "varchar", nullable: true, transformer: [encrypt] })
  url: Nullable<string> = null

  @Column({ type: "varchar", length: 500, nullable: false })
  uniqueHash = "DEPRECATED"

  @Column({ type: 'boolean', nullable: false, default: false })
  sshEnabled = false

  @Column({ type: "varchar", nullable: true })
  sshHost: Nullable<string> = null

  @Column({ type: "int", nullable: true })
  sshPort = 22

  @Column({ type: "varchar", nullable: true })
  sshKeyfile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sshUsername: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sshBastionHost: Nullable<string> = null

  @Column({ type: 'int', nullable: true })
  sshKeepaliveInterval: Nullable<number> = 60

  @Column({ type: 'boolean', nullable: false, default: false })
  ssl = false

  @Column({ type: 'varchar', nullable: true })
  sslCaFile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sslCertFile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sslKeyFile: Nullable<string> = null

  // this only takes effect if SSL certs are provided
  @Column({ type: 'boolean', nullable: false })
  sslRejectUnauthorized = true

  @Column({type: 'boolean', nullable: false, default: false})
  readOnlyMode = true

  @Column({ type: 'simple-json', nullable: false })
  options: ConnectionOptions = {}

  @Column({ type: 'simple-json', nullable: false })
  redshiftOptions: RedshiftOptions = {}

  @Column({type: 'simple-json', nullable: false})
  cassandraOptions: CassandraOptions = {}

  @Column({ type: 'simple-json', nullable: false })
  bigQueryOptions: BigQueryOptions = {}

  @Column({ type: 'simple-json', nullable: false, transformer: [azureEncrypt]})
  azureAuthOptions: AzureAuthOptions = {}

  @Column({ type: 'integer', nullable: true})
  authId: Nullable<number> = null

  @Column({ type: 'simple-json', nullable: false })
  libsqlOptions: LibSQLOptions = { mode: 'url' }

  // this is only for SQL Server.
  @Column({ type: 'boolean', nullable: false })
  trustServerCertificate = false

  // oracle only.
  @Column({type: 'varchar', nullable: true})
  serviceName: Nullable<string> = null
}

@Entity({ name: 'saved_connection' })
export class SavedConnection extends DbConnectionBase implements IConnection {

  withProps(props?: any): SavedConnection {

    if (props) {
      if (props.connectionType) {
        this.connectionType = props.connectionType;
      }
      SavedConnection.merge(this, props);
    }

    if (!this.createdAt) {
      this.createdAt = new Date();
    }

    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }

    return this;
  }

  @Column("varchar")
  name!: string

  @Column({
    type: 'varchar',
    nullable: true,
    default: null
  })
  labelColor?: string = 'default'

  @Column({ update: false, default: -1, type: 'integer' })
  workspaceId = -1

  @Column({ type: 'boolean', default: true })
  rememberPassword = true

  @Column({type: 'boolean', default: false})
  readOnlyMode = false

  @Column({type: 'varchar', nullable: true, transformer: [encrypt]})
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshKeyfilePassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshPassword: Nullable<string> = null

  _sshMode: SshMode = "agent"

  @Column({ name: "sshMode", type: "varchar", length: "8", nullable: false, default: "agent" })
  set sshMode(value: SshMode) {
    this._sshMode = value
    if (this._sshMode !== 'userpass') {
      this.sshPassword = null
    }

    if (this._sshMode !== 'keyfile') {
      this.sshKeyfile = null
      this.sshKeyfilePassword = null
    }

    if (this._sshMode === 'keyfile' && !this.sshKeyfile) {
      this.sshKeyfile = resolveHomePathToAbsolute("~/.ssh/id_rsa")
    }

    if (!this.sshKeepaliveInterval || this.sshKeepaliveInterval < 0) {
      // store null if zero, empty or negative
      this.sshKeepaliveInterval = null
    }
  }

  get sshMode(): SshMode {
    return this._sshMode
  }

  private smellsLikeUrl(url: string): boolean {
    return url.includes("://")
  }

  parse(url: string): boolean {
    try {
      const endings = [
        { connectionType: 'sqlite', options: ['.db', '.sqlite', '.sqlite3']},
        { connectionType: 'duckdb', options: ['.duckdb', '.ddb']}
      ]
      // const goodEndings = ['.db', '.sqlite', '.sqlite3']
      // const duckDbEndings = ['.duckdb', '.ddb']
      if (!this.smellsLikeUrl(url)) {
        // it's a sqlite file
        for (let i = 0; i < endings.length; i++) {
          const { connectionType, options } = endings[i];
          if(options.find((e) => url.endsWith(e))) {
            this.connectionType = connectionType as any
            this.defaultDatabase = url
            return
          }
        }
      }

      const parsed = new ConnectionString(url.replaceAll(/\s/g, "%20"))
      this.connectionType = parsed.protocol as ConnectionType || this.connectionType || 'postgresql'
      if (parsed.hostname && parsed.hostname.includes('redshift.amazonaws.com')) {
        this.connectionType = 'redshift'
      }

      if (parsed.hostname && parsed.hostname.includes('cockroachlabs.cloud')) {
        this.connectionType = 'cockroachdb'
        if (parsed.params?.options) {
          // TODO: fix this
          const regex = /--cluster=([A-Za-z0-9\-_]+)/
          const clusters = parsed.params.options.match(regex)
          this.options['cluster'] = clusters ? clusters[1] : undefined
        }
      }

      if (parsed.params?.sslmode && parsed.params.sslmode !== 'disable') {
        this.ssl = true
      }
      this.host = parsed.hostname || this.host
      this.port = parsed.port || this.port
      this.username = parsed.user || this.username
      this.password = parsed.password || this.password
      this.defaultDatabase = parsed.path?.[0] ?? this.defaultDatabase
      return true
    } catch (ex) {
      log.error('unable to parse connection string, assuming sqlite file', ex)
      return false
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  checkSqlite(): void {
    if (this.connectionType === 'sqlite' && !this.defaultDatabase) {
      throw new Error("database path must be set for SQLite databases")
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  maybeClearPasswords(): void {
    if (!this.rememberPassword) {
      this.password = null
      this.sshPassword = null
      this.sshKeyfilePassword = null
    }
  }

}
