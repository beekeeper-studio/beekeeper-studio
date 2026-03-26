import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { SshConfig } from './SshConfig'

@Entity({ name: 'connection_ssh_config' })
export class ConnectionSshConfig extends ApplicationEntity {
  withProps(props?: Partial<ConnectionSshConfig>): ConnectionSshConfig {
    if (props) ConnectionSshConfig.merge(this, props)
    return this
  }

  @Column({ type: 'int', nullable: false })
  connectionId: number

  @Column({ type: 'int', nullable: false })
  sshConfigId: number

  @Column({ type: 'int', nullable: false, default: 0 })
  position = 0

  // Back-reference to SavedConnection — required for the OneToMany inverse to resolve
  @ManyToOne('SavedConnection', 'sshConfigs', { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connectionId' })
  connection: any

  @ManyToOne(() => SshConfig, (cfg) => cfg.connectionSshConfigs, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sshConfigId' })
  sshConfig: SshConfig
}
