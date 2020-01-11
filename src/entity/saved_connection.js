import Crypto from 'crypto'
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm"

import {ApplicationEntity} from './application_entity'
import {EncryptedColumn} from 'typeorm-encrypted-column'
import config from '../config'


export class DbConnectionBase extends ApplicationEntity {

  @Column('varchar')
  connectionType

  @Column({type:"varchar", nullable: true})
  host = 'localhost'

  @Column({type: "int", nullable: true})
  port

  @Column({type: "varchar", nullable: true})
  username

  @Column({type: "varchar", nullable: true})
  defaultDatabase

  @Column({type: "varchar", nullable: true})
  path

  @Column({type: "varchar", nullable: true})
  uri

  @Column({type: "varchar", length: 500, nullable: false})
  uniqueHash

  /* 
    This unique hash is so that even if a user doesn't save
    the connection, we can still figure out if they're connected
    to the same database and keep track of queries against that connection
    and possibly do stuff like keep tabs open
  */
  @BeforeInsert()
  @BeforeUpdate()
  setUniqueHashCode() {
    let str = `${this.host}${this.port}${this.path}${this.uri}`
    this.uniqueHash = Crypto.createHash('md5').update(str).digest('hex')
  }

}



@Entity()
export class SavedConnection extends DbConnectionBase {

  @Column("varchar")
  name

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

}
