import { IConnection, ISimpleConnection } from '@/common/interfaces/IConnection'
import _ from 'lodash'
import { Entity, Column} from "typeorm"
import { DbConnectionBase } from './saved_connection'

@Entity({ name: 'used_connection' })
export class UsedConnection extends DbConnectionBase implements ISimpleConnection {

  constructor(other: IConnection) {
    super()
    if (other) {
      this.connectionType = other.connectionType
      this.defaultDatabase = other.defaultDatabase
      this.username = other.username
      this.uri = other.uri
      this.port = other.port
      this.host = other.host
      this.sshHost = other.sshHost
      this.sshPort = other.sshPort
      this.sshBastionHost = other.sshBastionHost
      this.ssl = other.ssl
      this.sslCaFile = other.sslCaFile
      this.sslCertFile = other.sslCertFile
      this.sslKeyFile = other.sslKeyFile
      if (other.id && other.workspaceId) {
        this.connectionId = other.id
        this.workspaceId = other.workspaceId
      }
    }

  }

  @Column({type: 'int', nullable: true})
  connectionId?: Nullable<number> = null

  @Column({ type: 'int', nullable: false})
  workspaceId: number = -1

}
