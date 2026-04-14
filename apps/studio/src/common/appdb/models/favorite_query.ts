import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { MaxLength } from 'class-validator';
import { Entity, Column, Index, BeforeInsert, BeforeUpdate, ManyToOne, JoinColumn } from 'typeorm'
import { ApplicationEntity  } from './application_entity'
import { QueryLike } from './base'
import { QueryFolder } from './QueryFolder'

@Entity({ name: 'favorite_query' })
export class FavoriteQuery extends ApplicationEntity implements QueryLike, ISavedQuery {
  withProps(props?: any): FavoriteQuery {
    if (props) FavoriteQuery.merge(this, props);
    return this;
  }

  @Column({type: "varchar", nullable: false})
  title!: string

  @MaxLength(2_000_000, { message: `Queries have a max length of 2,000,000 characters.` })
  @Column({type: "text", nullable: false, select: false})
  text!: string

  @Column({type: "text"})
  excerpt: string

  @Column({type: "varchar", nullable: true})
  database: string | null = null

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash!: string

  @Column({ type: 'integer', nullable: true, default: null })
  queryFolderId: Nullable<number> = null

  @Column({ type: 'float', nullable: false, default: 0 })
  position = 0.0

  // Do NOT initialize this to null. A null initializer becomes an own property
  // that gets copied into transport objects by cls.merge(), and TypeORM treats an
  // explicitly-null relation as "unset this FK", overriding the queryFolderId column.
  @ManyToOne(() => QueryFolder, (folder) => folder.queries, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'queryFolderId' })
  queryFolder?: QueryFolder

  @BeforeInsert()
  @BeforeUpdate()
  setDefaultDatabase(): void {
    // shouldn't be not null, so need a default
    if (!this.database) {
      this.database = '[blank]'
    }
    if (!this.connectionHash) {
      this.connectionHash = 'DEPRECATED'
    }
  }
  

}
