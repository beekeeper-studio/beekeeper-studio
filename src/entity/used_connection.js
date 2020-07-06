import { Entity } from "typeorm"
import {DbConnectionBase} from './saved_connection'

@Entity({ name: 'used_connection' })
export class UsedConnection extends DbConnectionBase {

  constructor(other) {
    super()
    if (other) {
      this.connectionType = other.connectionType
      this.defaultDatabase = other.defaultDatabase
      this.path = other.path
      this.uri = other.uri
      this.port = other.port
      this.host = other.host
      this.labelColor = other.labelColor
      this.name = other.name
    }

  }

}