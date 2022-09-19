
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm"

import {ApplicationEntity} from './application_entity'
import { resolveHomePathToAbsolute } from '../../utils'
import { loadEncryptionKey } from '../../encryption_key'
import { ConnectionString } from 'connection-string'
import log from 'electron-log'
import { IDbClients } from '@/lib/db/client'
import { EncryptTransformer } from '../transformers/Transformers'
import { IConnection, SshMode } from '@/common/interfaces/IConnection'


const encrypt = new EncryptTransformer(loadEncryptionKey())

export const ConnectionTypes = [
  { name: 'MySQL', value: 'mysql' },
  { name: 'MariaDB', value: 'mariadb' },
  { name: 'Postgres', value: 'postgresql' },
  { name: 'SQLite', value: 'sqlite' },
  { name: 'SQL Server', value: 'sqlserver' },
  { name: 'Amazon Redshift', value: 'redshift' },
  { name: 'CockroachDB', value: 'cockroachdb' },
  { name: 'Oracle (ultimate)', value: 'other'}
]

export interface RedshiftOptions {
  iamAuthenticationEnabled?: boolean
  accessKeyId?: string;
  secretAccessKey?: string;
  awsRegion?: string;
  clusterIdentifier?: string;
  databaseGroup?: string;
  tokenDurationSeconds?: number;
}

export interface ConnectionOptions {
  cluster?: string
}

function parseConnectionType(t: Nullable<IDbClients>) {
  if (!t) return null

  const mapping: {[x: string]: IDbClients} = {
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

  _connectionType: Nullable<IDbClients> = null

  @Column({ type: 'varchar', name: 'connectionType'})
  public set connectionType(value: Nullable<IDbClients>) {
    if (this._connectionType !== value) {
      const changePort = this._port === this.defaultPort
      this._connectionType = parseConnectionType(value)
      this._port = changePort ? this.defaultPort : this._port
    }
  }

  public get connectionType() {
    return this._connectionType
  }

  @Column({type:"varchar", nullable: true})
  host: string = 'localhost'

  _port: Nullable<number> = null

  @Column({type: "int", nullable: true})
  public set port(v : Nullable<number>) {
    this._port = v
  }

  public get port() : Nullable<number> {
    return this._port
  }


  public get defaultPort() : Nullable<number> {
    if (['mysql', 'mariadb'].includes(this.connectionType || '')) {
      return 3306
    } else if (this.connectionType === 'postgresql') {
      return 5432
    } else if (this.connectionType === 'sqlserver') {
      return 1433
    } else if (this.connectionType === 'cockroachdb') {
      return 26257
    }
    return null
  }

  _socketPath: Nullable<string> = null

  @Column({type: 'varchar', nullable: true})
  public set socketPath(v : Nullable<string>) {
    this._socketPath = v
  }

  public get socketPath() : Nullable<string> {
    return this._socketPath || this.defaultSocketPath
  }

  public get defaultSocketPath() : Nullable<string> {
    if(['mysql', 'mariadb'].includes(this.connectionType || '')) {
      return '/var/run/mysqld/mysqld.sock'
    } else if (this.connectionType === 'postgresql') {
      return '/var/run/postgresql'
    }
    return null
  }

  @Column({type: 'boolean', nullable: false, default: false})
  socketPathEnabled = false

  @Column({type: "varchar", nullable: true})
  username: Nullable<string> = null

  @Column({type: "varchar", nullable: true})
  domain: Nullable<string> = null

  @Column({type: "varchar", nullable: true})
  defaultDatabase: Nullable<string> = null

  @Column({type: "varchar", nullable: true})
  uri: Nullable<string> = null

  @Column({type: "varchar", length: 500, nullable: false})
  uniqueHash = "DEPRECATED"

  @Column({type: 'boolean', nullable: false, default: false})
  sshEnabled = false

  @Column({type: "varchar", nullable: true})
  sshHost: Nullable<string> = null

  @Column({type: "int", nullable: true})
  sshPort: number = 22

  @Column({type: "varchar", nullable: true})
  sshKeyfile: Nullable<string> = null

  @Column({type: 'varchar', nullable: true})
  sshUsername: Nullable<string> = null

  @Column({type: 'varchar', nullable: true})
  sshBastionHost: Nullable<string> = null

  @Column({type: 'int', nullable: true})
  sshKeepaliveInterval: Nullable<number> = null

  @Column({type: 'boolean', nullable: false, default: false})
  ssl: boolean = false

  @Column({type: 'varchar', nullable: true})
  sslCaFile: Nullable<string> = null

  @Column({type: 'varchar', nullable: true})
  sslCertFile: Nullable<string> = null

  @Column({type: 'varchar', nullable: true})
  sslKeyFile: Nullable<string> = null

  // this only takes effect if SSL certs are provided
  @Column({type: 'boolean', nullable: false})
  sslRejectUnauthorized: boolean = true


  @Column({type: 'simple-json', nullable: false})
  options: ConnectionOptions = {}

  @Column({type: 'simple-json', nullable: false})
  redshiftOptions: RedshiftOptions = {}

  // this is only for SQL Server.
  @Column({type: 'boolean', nullable: false})
  trustServerCertificate = false
}

@Entity({ name: 'saved_connection'} )
export class SavedConnection extends DbConnectionBase implements IConnection {

  @Column("varchar")
  name!: string

  @Column({
    type: 'varchar',
    nullable: true,
    default: null
  })
  labelColor?: string = 'default'

  @Column({update: false, default: -1, type: 'integer'})
  workspaceId: number = -1

  @Column({type: 'boolean', default: true})
  rememberPassword: boolean = true

  @Column({type: 'varchar', nullable: true, transformer: [encrypt]})
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshKeyfilePassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshPassword: Nullable<string> = null

  @Column({ type: 'integer', default: 0})
  sshKeepaliveInterval: Nullable<number> = null

  _sshMode: SshMode = "agent"

  @Column({name: "sshMode", type: "varchar", length: "8", nullable: false, default: "agent"})
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

  get sshMode() {
    return this._sshMode
  }

  private smellsLikeUrl(url: string): boolean {
    return url.includes("://")
  }

  parse(url: string) {
    try {
      const goodEndings = ['.db', '.sqlite', '.sqlite3']
      if (!this.smellsLikeUrl(url)) {
        // it's a sqlite file
        if(goodEndings.find((e) => url.endsWith(e))) {
          // it's a valid sqlite file
          this.connectionType = 'sqlite'
          this.defaultDatabase = url
          return true
        } else {
          // do nothing, continue url parsing
        }
      }

      const parsed = new ConnectionString(url.replaceAll(/\s/g, "%20"))
      this.connectionType = parsed.protocol as IDbClients || this.connectionType || 'postgresql'
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
  checkSqlite() {
    if (this.connectionType === 'sqlite' && !this.defaultDatabase) {
      throw new Error("database path must be set for SQLite databases")
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  maybeClearPasswords() {
    if (!this.rememberPassword) {
      this.password = null
      this.sshPassword = null
      this.sshKeyfilePassword = null
    }
  }

}
