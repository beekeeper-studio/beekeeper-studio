import { Entity, Column, OneToMany } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { loadEncryptionKey } from '../../encryption_key'
import { EncryptTransformer } from '../transformers/Transformers'
import { TransportSshConfig } from '@/common/transport/TransportSshConfig'
import { SshMode } from '@/common/interfaces/IConnection'

const encrypt = new EncryptTransformer(loadEncryptionKey())

@Entity({ name: 'ssh_config' })
export class SshConfig extends ApplicationEntity implements TransportSshConfig {
  withProps(props?: Partial<TransportSshConfig>): SshConfig {
    if (props) SshConfig.merge(this, props)
    return this
  }

  // Back-reference to the join table; not used directly in app logic
  @OneToMany('ConnectionSshConfig', 'sshConfig')
  connectionSshConfigs?: any[]

  @Column({ type: 'varchar', nullable: false })
  host: string

  @Column({ type: 'int', nullable: false, default: 22 })
  port = 22

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
}
