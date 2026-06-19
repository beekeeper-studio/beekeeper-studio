import { Entity, Column, OneToMany, ManyToOne, JoinColumn, BeforeRemove, BeforeInsert, BeforeUpdate, Not, IsNull } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { FavoriteQuery } from './favorite_query'
import pluralize from 'pluralize'

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

  // Do NOT initialize this to null. A null initializer becomes an own property
  // that gets copied into transport objects by cls.merge(), and TypeORM treats an
  // explicitly-null relation as "unset this FK", overriding the parentId column.
  @ManyToOne(() => QueryFolder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: QueryFolder

  @OneToMany(() => FavoriteQuery, (query) => query.queryFolder)
  queries: FavoriteQuery[]

  @BeforeRemove()
  async preventRemoveIfNotEmpty(): Promise<void> {
    const count = await FavoriteQuery.countBy({ queryFolderId: this.id })
    if (count > 0) {
      throw new Error(`Cannot delete folder "${this.name}" — move or remove its ${pluralize('query', count, true)} first.`)
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  async preventDuplicateName(): Promise<void> {
    if (!this.name) return
    const where: any = {
      name: this.name,
      parentId: this.parentId ?? IsNull(),
    }
    if (this.id) where.id = Not(this.id)
    const existing = await QueryFolder.findOneBy(where)
    if (existing) {
      throw new Error(`A folder named "${this.name}" already exists in this location.`)
    }
  }
}
