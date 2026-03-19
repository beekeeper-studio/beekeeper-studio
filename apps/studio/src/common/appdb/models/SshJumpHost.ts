import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { EncryptTransformer } from '../transformers/Transformers'
import { TransportSshJumpHost } from '@/common/transport/TransportSshJumpHost'

const encrypt = new EncryptTransformer(loadEncryptionKey())

@Entity({ name: 'ssh_jump_host' })
export class SshJumpHost extends ApplicationEntity implements TransportSshJumpHost {
  withProps(props?: Partial<TransportSshJumpHost>): SshJumpHost {
    if (props) SshJumpHost.merge(this, props)
    return this
  }

  @ManyToOne('SavedConnection', 'sshJumpHosts', { nullable: true, onDelete: 'CASCADE' })
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
