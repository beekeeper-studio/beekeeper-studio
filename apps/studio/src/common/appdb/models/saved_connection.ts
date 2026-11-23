import { IsNotEmpty, IsString } from "class-validator"
import { Entity, Column, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn } from "typeorm"
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { parseConnectionUrl } from '@/common/connectionUrl'
import log from '@bksLogger'
import { AzureCredsEncryptTransformer, EncryptTransformer, SnowflakeOptionsTransformer, SurrealDbEncryptTransformer } from '../transformers/Transformers'
import { IConnection, SshMode } from '@/common/interfaces/IConnection'
import { AzureAuthOptions, BigQueryOptions, CassandraOptions, ConnectionType, ConnectionTypes, DynamoDBOptions, LibSQLOptions, RedshiftOptions, IamAuthOptions, SQLAnywhereOptions, SurrealDBOptions, SnowflakeOptions, SqlServerOptions } from "@/lib/db/types"
import { resolveHomePathToAbsolute } from "@/handlers/utils"
import { ConnectionFolder } from './ConnectionFolder'

const encrypt = new EncryptTransformer(loadEncryptionKey())
const azureEncrypt = new AzureCredsEncryptTransformer(loadEncryptionKey())
const surrealEncrypt = new SurrealDbEncryptTransformer(loadEncryptionKey())
const snowflakeTransformer = new SnowflakeOptionsTransformer()

// TODO (@day): Currently this is apparently "just for oracle".
// we should move away from stuff like `sqlAnywhereOptions` and `redshiftOptions`
// instead this should be the object for connectionType specific options.
// We can probably do some type wizardry as well based on connectionType
export interface ConnectionOptions {
  cluster?: string
  jwtAuthEnabled?: boolean
  connectionMethod?: 'manual' | 'connectionString'
  connectionString?: string,
  // Oracle: connect with an administrative privilege, eg to log in as SYS
  privilege?: 'SYSDBA' | 'SYSOPER' | null
  // Oracle: whether the serviceName column holds a service name (default) or a SID
  oracleIdentifierType?: 'serviceName' | 'sid'
  enableClearText?: boolean
  // SQLite: create the database file on the next connect instead of refusing a
  // missing one. Set by the Create button, cleared once a connect succeeds.
  createDatabaseFile?: boolean
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
      case 'starrocks':
        port = 9030
        break
      case 'postgresql':
      case 'greengage':
        port = 5432
        break
      case 'sqlserver':
        port = 1433
        break
      case 'cockroachdb':
        port = 26257
        break
      case 'redshift':
        port = 5432
        break
      case 'oracle':
        port = 1521
        break
      case 'cassandra':
      case 'scylladb':
        port = 9042
        break
      case 'bigquery':
        port = 443
        break
      case 'firebird':
        port = 3050
        break
      case 'sqlanywhere':
        port = 2638
        break
      case 'trino':
        port = 8080
        break
      case 'clickhouse':
        port = 8123
        break
      case 'redis':
        port = 6379
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
    } else if (['postgresql', 'greengage'].includes(this.connectionType || '')) {
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
  sshPort: Nullable<number> = null

  @Column({ type: "varchar", nullable: true })
  sshKeyfile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sshUsername: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sshBastionHost: Nullable<string> = null

  @Column({ type: 'int', nullable: true })
  sshBastionHostPort: Nullable<number> = null

  @Column({ type: 'varchar', length: 8, nullable: false, default: 'agent' })
  sshBastionMode: SshMode = 'agent'

  @Column({ type: 'varchar', nullable: true })
  sshBastionUsername: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  sshBastionKeyfile: Nullable<string> = null

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

  // Used for Oracle only
  @Column({ type: 'simple-json', nullable: false })
  options: ConnectionOptions = { connectionMethod: 'manual' }

  @Column({ type: 'simple-json', nullable: false })
  redshiftOptions: RedshiftOptions = {}

  @Column({type: 'simple-json', nullable: false})
  cassandraOptions: CassandraOptions = {}

  @Column({ type: 'simple-json', nullable: false })
  bigQueryOptions: BigQueryOptions = {}

  @Column({ type: 'simple-json', nullable: false, transformer: [azureEncrypt]})
  azureAuthOptions: AzureAuthOptions = {}

  @Column({ type: 'simple-json', nullable: false, transformer: [azureEncrypt]})
  iamAuthOptions: IamAuthOptions = {}

  @Column({ type: 'integer', nullable: true})
  authId: Nullable<number> = null

  @Column({ type: 'simple-json', nullable: false })
  libsqlOptions: LibSQLOptions = { mode: 'url' }

  @Column({ type: 'simple-json', nullable: false })
  sqlAnywhereOptions: SQLAnywhereOptions = { mode: 'server' }

  @Column({ type: 'simple-json', nullable: false, transformer: [surrealEncrypt] })
  surrealDbOptions: SurrealDBOptions = {};

  @Column({ type: 'simple-json', nullable: false })
  dynamoDbOptions: DynamoDBOptions = {};

  @Column({ type: 'simple-json', nullable: false, transformer: [snowflakeTransformer] })
  snowflakeOptions: SnowflakeOptions = {};

  // this is only for SQL Server. Defaults on: every stock install presents a self-signed
  // certificate and tedious validates by default, so a new connection with a correct host and
  // password fails without it. The integrated-auth path already trusts self-signed certs
  // (encryptionMode 'on' -> TrustServerCertificate=yes), so this keeps the two consistent.
  // Class-field default: applies to newly constructed entities only, saved rows keep theirs.
  @Column({ type: 'boolean', nullable: false })
  trustServerCertificate = true

  // SQL Server only. Integrated authentication (SSPI/Kerberos/NTLM) via msnodesqlv8.
  @Column({ type: 'boolean', nullable: false })
  windowsAuthEnabled = false

  // SQL Server integrated auth only. Encryption mode, optional pinned server certificate,
  // and optional SPN override for the Kerberos/Windows (ODBC) connection method.
  @Column({ type: 'simple-json', nullable: false })
  sqlServerOptions: SqlServerOptions = {}

  // oracle only. Holds the SID instead when options.oracleIdentifierType is 'sid'.
  @Column({type: 'varchar', nullable: true})
  serviceName: Nullable<string> = null
}

@Entity({ name: 'saved_connection' })
export class SavedConnection extends DbConnectionBase implements IConnection {
  static readonly searchableFields: string[] = [ 'name' ];

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

  @IsString({ message: 'Name is required' })
  @IsNotEmpty({ message: 'Name is required' })
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

  @Column({ type: 'integer', nullable: true, default: null })
  connectionFolderId: Nullable<number> = null

  @Column({ type: 'float', nullable: false, default: 0 })
  position = 0.0

  // Do NOT initialize this to null. A null initializer becomes an own property
  // that gets copied into transport objects by cls.merge(), and TypeORM treats an
  // explicitly-null relation as "unset this FK", overriding the connectionFolderId column.
  @ManyToOne(() => ConnectionFolder, (folder) => folder.connections, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'connectionFolderId' })
  connectionFolder?: ConnectionFolder

  @Column({type: 'varchar', nullable: true, transformer: [encrypt]})
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshKeyfilePassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshPassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshBastionPassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshBastionKeyfilePassword: Nullable<string> = null

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

  // Applies what the URL states and leaves every other field as it was. In particular a URL
  // (or bare `host:port`) with no user in it keeps the existing user and password.
  parse(url: string): boolean {
    try {
      const fields = parseConnectionUrl(url)

      this.connectionType = fields.connectionType as ConnectionType || this.connectionType || 'postgresql'

      if (fields.cockroach) {
        this.options = { ...this.options, ...fields.cockroach }
      }
      if (fields.ssl) this.ssl = true
      if (fields.trustServerCertificate) this.trustServerCertificate = true

      if (fields.host !== undefined) this.host = fields.host
      if (fields.port !== undefined) this.port = fields.port
      if (fields.username !== undefined) this.username = fields.username
      if (fields.password !== undefined) this.password = fields.password
      if (fields.defaultDatabase !== undefined) this.defaultDatabase = fields.defaultDatabase
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
      this.sshBastionPassword = null
      this.sshBastionKeyfilePassword = null
    }
  }

}
