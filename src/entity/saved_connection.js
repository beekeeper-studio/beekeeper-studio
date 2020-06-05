import Crypto from 'crypto'
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm"

import {ApplicationEntity} from './application_entity'
import {EncryptedColumn} from 'typeorm-encrypted-column'
import config from '../config'
import { resolveHomePathToAbsolute } from '../lib/utils'


export class DbConnectionBase extends ApplicationEntity {

  _connectionType = null

  @Column({ type: 'varchar', name: 'connectionType'})
  set connectionType(value) {
    this._connectionType = value
    if (['mysql', 'mariadb'].includes(this._connectionType)) {
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
  host = 'localhost'

  @Column({type: "int", nullable: true})
  port

  @Column({type: "varchar", nullable: true})
  username

  @Column({type: "varchar", nullable: true})
  domain

  @Column({type: "varchar", nullable: true})
  defaultDatabase

  @Column({type: "varchar", nullable: true})
  path

  @Column({type: "varchar", nullable: true})
  uri

  @Column({type: "varchar", length: 500, nullable: false})
  uniqueHash

  @Column({type: 'boolean', nullable: false, default: false})
  sshEnabled = false

  @Column({type: "varchar", nullable: true})
  sshHost

  @Column({type: "int", nullable: true})
  sshPort = 22

  _sshMode = "agent"

  @Column({name: "sshMode", type: "varchar", length: "8", nullable: false, default: "agent"})
  set sshMode(value) {
    this._sshMode = value
    if (!this._sshMode != 'userpass') {
      this.sshPassword = null
    } else if (this._sshMode != 'keyfile') {
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

  @Column({type: "varchar", nullable: true})
  sshKeyfile = null

  @Column({type: 'varchar', nullable: true})
  sshUsername

  @Column({type: 'varchar', nullable: true})
  sshBastionHost

  @Column({type: 'boolean', nullable: false, default: false})
  ssl

  /*
    This unique hash is so that even if a user doesn't save
    the connection, we can still figure out if they're connected
    to the same database and keep track of queries against that connection
    and possibly do stuff like keep tabs open
  */
  @BeforeInsert()
  @BeforeUpdate()
  setUniqueHashCode() {
    let str = `${this.host}${this.port}${this.path}${this.uri}${this.sshHost}${this.sshPort}`
    this.uniqueHash = Crypto.createHash('md5').update(str).digest('hex')
  }

}

@Entity({ name: 'saved_connection'} )
export class SavedConnection extends DbConnectionBase {

  @Column("varchar")
  name

  @Column({
    type: 'varchar',
    nullable: true,
    default: null
  })
  labelColor = null

  @Column({type: 'boolean', default: true})
  rememberPassword = true

  @EncryptedColumn({
    type: 'varchar',
    nullable: true,
    encrypt: {
      key: config.encryptionKey,
      algorithm: 'aes-256-cbc',
      ivLength: 16,
      looseMatching: false
    }
  })
  password

  @EncryptedColumn({
    type: "varchar",
    nullable: true,
    encrypt: {
      key: config.encryptionKey,
      algorithm: 'aes-256-cbc',
      ivLength: 16,
      looseMatching: false
    }
  })
  sshKeyfilePassword

  @EncryptedColumn({
    type: 'varchar',
    nullable: true,
    encrypt: {
      key: config.encryptionKey,
      algorithm: 'aes-256-cbc',
      ivLength: 16,
      looseMatching: false
    }
  })
  sshPassword

  @BeforeInsert()
  @BeforeUpdate()
  maybeClearPasswords() {
    console.log("checking password settings")
    if (!this.rememberPassword) {
      this.password = null
      this.sshPassword = null
      this.rememberSshKeyfilePassword = null
    }
  }

}
