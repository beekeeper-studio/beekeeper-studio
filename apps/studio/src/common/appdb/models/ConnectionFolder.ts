import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { SavedConnection } from './saved_connection'

@Entity({ name: 'connection_folder' })
export class ConnectionFolder extends ApplicationEntity {
  withProps(props?: any): ConnectionFolder {
    if (props) ConnectionFolder.merge(this, props)
    return this
  }

  @Column({ type: 'varchar', nullable: false })
  name: string

  @Column({ type: 'varchar', nullable: true })
  description: Nullable<string> = null

  @Column({ type: 'boolean', default: true })
  expanded = true

  @Column({ type: 'integer', nullable: true, default: null })
  parentId: Nullable<number> = null

  @ManyToOne(() => ConnectionFolder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Nullable<ConnectionFolder> = null

  @OneToMany(() => SavedConnection, (conn) => conn.connectionFolder)
  connections: SavedConnection[]
}
