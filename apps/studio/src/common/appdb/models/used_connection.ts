import { IConnection, ISimpleConnection } from '@/common/interfaces/IConnection'
import _ from 'lodash'
import { Entity, Column} from "typeorm"
import { DbConnectionBase } from './saved_connection'

@Entity({ name: 'used_connection' })
export class UsedConnection extends DbConnectionBase implements ISimpleConnection {

  /**
   * Record that `config` was just connected to. Called by the backend once
   * the connection is actually up - a failed attempt is not a "use".
   *
   * `config.id` must be a saved_connection id (or null for a connection that
   * was never saved). used_connection has its own id sequence, and every
   * per-connection thing the app persists - tabs, pins, hidden entities, tab
   * history - is keyed on the saved_connection id, so a used_connection must
   * never be passed in here as the config.
   *
   * A saved connection keeps one row, refreshed with the latest details on
   * each connect. Anything else has no stable identity to match on and gets
   * a fresh row every time; the recent list copes with the duplicates.
   */
  static async recordUse(config: IConnection): Promise<UsedConnection> {
    if (!_.isUndefined((config as Partial<UsedConnection>).connectionId)) {
      throw new Error("recordUse was handed a used_connection. Connect with a saved connection, or a new unsaved one.")
    }
    
    const savedConnectionId = config.id ?? null
    const existing = savedConnectionId
      ? await UsedConnection.findOneBy({ connectionId: savedConnectionId, workspaceId: config.workspaceId })
      : null

    const used = existing ?? new UsedConnection()
    used.withProps({ ...config, connectionId: savedConnectionId } as IConnection)
    return await used.save()
  }

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
      this.sshBastionHostPort = other.sshBastionHostPort
      this.sshBastionMode = other.sshBastionMode
      this.sshBastionUsername = other.sshBastionUsername
      this.sshBastionKeyfile = other.sshBastionKeyfile
      this.sshKeepaliveInterval = other.sshKeepaliveInterval
      this.ssl = other.ssl
      this.sslCaFile = other.sslCaFile
      this.sslCertFile = other.sslCertFile
      this.sslKeyFile = other.sslKeyFile
      this.readOnlyMode = other.readOnlyMode
      // `connectionId` is always passed explicitly by the caller: it's a
      // saved_connection reference, or null for a connection that was never
      // saved. It is never inferred from `id`, which belongs to a different
      // id sequence entirely (see recordUse above).
      this.connectionId = (other as Partial<UsedConnection>).connectionId ?? null
      if (!_.isNil(other.workspaceId)) {
        this.workspaceId = other.workspaceId
      }
      this.options = other.options
      this.trustServerCertificate = other.trustServerCertificate
      this.windowsAuthEnabled = other.windowsAuthEnabled
      this.sqlServerOptions = other.sqlServerOptions
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
      this.dynamoDbOptions = other.dynamoDbOptions

    }

    return this;
  }

  @Column({type: 'int', nullable: true})
  connectionId?: Nullable<number> = null

  @Column({ type: 'int', nullable: false})
  workspaceId = -1

}
