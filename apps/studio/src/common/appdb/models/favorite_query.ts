import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { ApplicationEntity  } from './application_entity'
import { QueryLike } from './base'
import { MaxLength } from 'class-validator'

@Entity({ name: 'favorite_query' })
export class FavoriteQuery extends ApplicationEntity implements QueryLike, ISavedQuery {
  withProps(props?: any): FavoriteQuery {
    if (props) FavoriteQuery.merge(this, props);
    return this;
  }

  @Column({type: "varchar", nullable: false})
  title!: string

  @MaxLength(2000000, { message: 'Beekeeper does not support queries that are over 2m characters long' })
  @Column({type: "text", nullable: false})
  text!: string

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
