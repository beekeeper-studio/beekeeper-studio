import { Entity, Column } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { EncryptTransformer } from '../transformers/Transformers'
import { TransportSshConfig } from '@/common/transport/TransportSshConfig'
import { SshMode } from '@/common/interfaces/IConnection'
import { ConnectionSshConfig } from './ConnectionSshConfig'
import { SavedConnection } from './saved_connection'

const encrypt = new EncryptTransformer(loadEncryptionKey())

@Entity({ name: 'ssh_config' })
export class SshConfig extends ApplicationEntity implements TransportSshConfig {
  withProps(props?: Partial<TransportSshConfig>): SshConfig {
    if (props) SshConfig.merge(this, props)
    return this
  }

  @Column({ type: 'varchar', nullable: false })
  host: string

  @Column({ type: 'int', nullable: true })
  port: Nullable<number> = null

  @Column({ type: 'varchar', length: 8, nullable: false, default: 'agent' })
  mode: SshMode = 'agent'

  @Column({ type: 'varchar', nullable: true })
  username: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  keyfile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  keyfilePassword: Nullable<string> = null

  /**
   * Scan saved_connection for legacy SSH columns (sshHost, sshBastionHost, etc.)
   * and populate ssh_config + connection_ssh_config for any row that doesn't
   * already have a join entry. Idempotent — safe to call any time.
   */
  static async migrateLegacyColumns(): Promise<void> {
    const connections = await SavedConnection.findBy({ sshEnabled: true })

    for (const conn of connections) {
      if (await ConnectionSshConfig.existsBy({ connectionId: conn.id })) {
        continue
      }

      let position = 0

      // Check the bastion host first
      if (conn.sshBastionHost != null && conn.sshBastionHost !== '') {
        await ConnectionSshConfig.create({
          connectionId: conn.id,
          position: position++,
          sshConfig: SshConfig.create({
            host: conn.sshBastionHost,
            port: conn.sshBastionHostPort,
            mode: conn.sshBastionMode || 'agent',
            username: conn.sshBastionUsername,
            password: conn.sshBastionPassword,
            keyfile: conn.sshBastionKeyfile,
            keyfilePassword: conn.sshBastionKeyfilePassword,
          }),
        }).save()
      }

      if (conn.sshHost != null && conn.sshHost !== '') {
        await ConnectionSshConfig.create({
          connectionId: conn.id,
          position: position++,
          sshConfig: SshConfig.create({
            host: conn.sshHost,
            port: conn.sshPort,
            mode: conn.sshMode || 'agent',
            username: conn.sshUsername,
            password: conn.sshPassword,
            keyfile: conn.sshKeyfile,
            keyfilePassword: conn.sshKeyfilePassword,
          }),
        }).save()
      }
    }
  }
}

