import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { MaxLength } from 'class-validator';
import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { ApplicationEntity  } from './application_entity'
import { QueryLike } from './base'

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
