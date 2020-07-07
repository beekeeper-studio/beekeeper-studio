import { Entity, Column} from "typeorm"
import { DbConnectionBase } from './saved_connection'
import path from 'path'
import TimeAgo from 'javascript-time-ago'

@Entity({ name: 'used_connection' })
export class UsedConnection extends DbConnectionBase {

  constructor(other) {
    super()
    if (other) {
      this.connectionType = other.connectionType
      this.defaultDatabase = other.defaultDatabase
      this.username = other.username
      this.path = other.path
      this.uri = other.uri
      this.port = other.port
      this.host = other.host
      this.sshHost = other.sshHost
      this.sshBastionHost = other.sshBastionHost
      this.labelColor = other.labelColor
      this.name = other.name
      if (other.id) {
        this.savedConnectionId = other.id
      }
    }

  }


  get label() {
    if (this.savedConnection) {
      return this.savedConnection.name
    } else {
      if (this.connectionType === 'sqlite') {
        return path.basename(this.defaultDatabase)
      } else {
        return this.simpleConnectionString
      }

    }
  }

  get lastUsedWords() {
    const timeAgo = new TimeAgo('en-US')
    return timeAgo.format(this.updatedAt)
  }

  get labelColor() {
    return this.savedConnection ? this.savedConnection.labelColor : 'default'
  }

  @Column({type: 'int', nullable: true})
  savedConnectionId = null

}