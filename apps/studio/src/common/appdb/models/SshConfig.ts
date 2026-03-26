import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { EncryptTransformer } from '../transformers/Transformers'
import { TransportSshConfig } from '@/common/transport/TransportSshConfig'

const encrypt = new EncryptTransformer(loadEncryptionKey())

@Entity({ name: 'ssh_config' })
export class SshConfig extends ApplicationEntity implements TransportSshConfig {
  withProps(props?: Partial<TransportSshConfig>): SshConfig {
    if (props) SshConfig.merge(this, props)
    return this
  }

  @ManyToOne('SavedConnection', 'sshConfigs', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connectionId' })
  connection?: any

  @Column({ type: 'int', nullable: true, default: null })
  connectionId: Nullable<number> = null

  @Column({ type: 'int', nullable: false, default: 0 })
  position = 0

  @Column({ type: 'varchar', nullable: false })
  host: string

  @Column({ type: 'int', nullable: false, default: 22 })
  port = 22

  @Column({ type: 'varchar', length: 8, nullable: false, default: 'agent' })
  mode: import('@/common/interfaces/IConnection').SshMode = 'agent'

  @Column({ type: 'varchar', nullable: true })
  username: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  password: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true })
  keyfile: Nullable<string> = null

  @Column({ type: 'varchar', nullable: true, transformer: [encrypt] })
  keyfilePassword: Nullable<string> = null
}
