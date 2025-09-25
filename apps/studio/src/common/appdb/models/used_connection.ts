import { IConnection, ISimpleConnection } from '@/common/interfaces/IConnection'
import _ from 'lodash'
import { Entity, Column} from "typeorm"
import { DbConnectionBase } from './saved_connection'

@Entity({ name: 'used_connection' })
export class UsedConnection extends DbConnectionBase implements ISimpleConnection {

  withProps(other: IConnection): UsedConnection {
    if (other) {
      this.connectionType = other.connectionType
      this.defaultDatabase = other.defaultDatabase
      this.username = other.username
      this.url = other.url
      this.port = other.port
      this.host = other.host
      this.sshHost = other.sshHost
      this.sshPort = other.sshPort
      this.sshBastionHost = other.sshBastionHost
      this.sshKeepaliveInterval = other.sshKeepaliveInterval
      this.ssl = other.ssl
      this.sslCaFile = other.sslCaFile
      this.sslCertFile = other.sslCertFile
      this.sslKeyFile = other.sslKeyFile
      this.readOnlyMode = other.readOnlyMode
      if (other.id && other.workspaceId) {
        this.connectionId = other.id
        this.workspaceId = other.workspaceId
      }
      this.options = other.options
      this.trustServerCertificate = other.trustServerCertificate
      this.redshiftOptions = other.redshiftOptions
      this.cassandraOptions = other.cassandraOptions
      this.socketPath = other.socketPath
      this.socketPathEnabled = other.socketPathEnabled
      this.bigQueryOptions = other.bigQueryOptions
      this.azureAuthOptions = other.azureAuthOptions
      this.iamAuthOptions = other.iamAuthOptions
      // TEMP (@day): this is just till we fix the used conn duplication issue
      this.authId = other.authId
      this.libsqlOptions = other.libsqlOptions
      this.sqlAnywhereOptions = other.sqlAnywhereOptions
      this.surrealDbOptions = other.surrealDbOptions

    }

    return this;
  }

  @Column({type: 'int', nullable: true})
  connectionId?: Nullable<number> = null

  @Column({ type: 'int', nullable: false})
  workspaceId = -1

}
