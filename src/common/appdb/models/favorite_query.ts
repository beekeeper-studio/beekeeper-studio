import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { ApplicationEntity  } from './application_entity'
import { QueryLike } from './base'

@Entity({ name: 'favorite_query' })
export class FavoriteQuery extends ApplicationEntity implements QueryLike {

  @Column({type: "varchar", nullable: false})
  title!: string

  @Column({type: "text", nullable: false})
  text!: string

  @Column({type: "varchar", nullable: true})
  database: string | null = null

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash!: string

  @BeforeInsert()
  @BeforeUpdate()
  setDefaultDatabase() {
    // shouldn't be not null, so need a default
    if (!this.database) {
      this.database = '[blank]'
    }
    if (!this.connectionHash) {
      this.connectionHash = 'DEPRECATED'
    }
  }

}
