import { Entity, Column } from 'typeorm'
import { ApplicationEntity } from './application_entity'

@Entity({ name: 'query_folder' })
export class QueryFolder extends ApplicationEntity {
  withProps(props?: any): QueryFolder {
    if (props) QueryFolder.merge(this, props)
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
}
