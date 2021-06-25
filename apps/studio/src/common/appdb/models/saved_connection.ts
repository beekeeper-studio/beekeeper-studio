import path from 'path'
import Crypto from 'crypto'
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm"

import {ApplicationEntity} from './application_entity'
import { resolveHomePathToAbsolute } from '../../utils'
import { loadEncryptionKey } from '../../encryption_key'
import { ConnectionString } from 'connection-string'
import log from 'electron-log'
import { IDbClients } from '@/lib/db/client'
import { EncryptTransformer } from '../transformers/Transformers'


const encrypt = new EncryptTransformer(loadEncryptionKey())

export const ConnectionTypes = [
  { name: 'MySQL', value: 'mysql' },
  { name: 'MariaDB', value: 'mariadb' },
  { name: 'Postgres', value: 'postgresql' },
  { name: 'SQLite', value: 'sqlite' },
  { name: 'SQL Server', value: 'sqlserver' },
  { name: 'Amazon Redshift', value: 'redshift' },
  { name: 'CockroachDB', value: 'cockroachdb' }
]

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
  set connectionType(value: Nullable<IDbClients>) {
    this._connectionType = parseConnectionType(value)
    if (['mysql', 'mariadb'].includes(this._connectionType || '')) {
      this.port = 3306
    } else if (this._connectionType === 'postgresql') {
      this.port = 5432
    } else if (this._connectionType === 'sqlserver') {
      this.port = 1433
    } else if (this._connectionType === 'cockroachdb') {
      this.port = 26257
    }
  }

  get connectionType() {
    return this._connectionType
  }

  @Column({type:"varchar", nullable: true})
  host: string = 'localhost'

  @Column({type: "int", nullable: true})
  port: Nullable<number> = null

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

  // GETTERS
  get hash() {
    const str = [
      this.host,
      this.port,
      this.uri,
      this.sshHost,
      this.sshPort,
      this.defaultDatabase,
      this.sshBastionHost,
      this.sslCaFile,
      this.sslCertFile,
      this.sslKeyFile
    ].map(part => part || "").join("")
    return Crypto.createHash('md5').update(str).digest('hex')
  }


  get simpleConnectionString() {
    if (this.connectionType === 'sqlite') {
      return path.basename(this.defaultDatabase || "./unknown.db")
    } else {
      let connectionString = `${this.host}:${this.port}`;
      if (this.defaultDatabase) {
        connectionString += `/${this.defaultDatabase}`
      }
      return connectionString
    }
  }

  get fullConnectionString() {
    if (this.connectionType === 'sqlite') {
      return this.defaultDatabase || "./unknown.db"
    } else {
      let result = `${this.username || 'user'}@${this.host}:${this.port}`

      if (this.defaultDatabase) {
        result += `/${this.defaultDatabase}`
      }

      if (this.sshHost) {
        result += ` via ${this.sshUsername}@${this.sshHost}`
        if (this.sshBastionHost) result += ` jump(${this.sshBastionHost})`
      }
      return result
    }
  }


}

@Entity({ name: 'saved_connection'} )
export class SavedConnection extends DbConnectionBase {

  @Column("varchar")
  name!: string

  @Column({
    type: 'varchar',
    nullable: true,
    default: null
  })
  labelColor?: string = 'default'

  @Column({type: 'boolean', default: true})
  rememberPassword: boolean = true

  @Column({type: 'varchar', nullable: true, transformer: [encrypt]})
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshKeyfilePassword: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  sshPassword: Nullable<string> = null



  _sshMode: string = "agent"

  @Column({name: "sshMode", type: "varchar", length: "8", nullable: false, default: "agent"})
  set sshMode(value: string) {
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
      if(goodEndings.find((e) => url.endsWith(e)) && !this.smellsLikeUrl(url)) {
        // it's a sqlite file
        this.connectionType = 'sqlite'
        this.defaultDatabase = url
        return true
      }

      const parsed = new ConnectionString(url)      
      this.connectionType = parsed.protocol as IDbClients || this.connectionType || 'postgresql'
      if (parsed.hostname && parsed.hostname.includes('redshift.amazonaws.com')) {
        this.connectionType = 'redshift'
      }
      this.host = parsed.hostname || this.host
      this.port = parsed.port || this.port
      this.username = parsed.user || this.username
      this.password = parsed.password || this.password
      this.defaultDatabase = parsed.path ? parsed.path[0] : null || this.defaultDatabase
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
