import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { FavoriteQuery } from './favorite_query'

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

  @ManyToOne(() => QueryFolder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Nullable<QueryFolder> = null

  @OneToMany(() => FavoriteQuery, (query) => query.queryFolder)
  queries: FavoriteQuery[]
}
