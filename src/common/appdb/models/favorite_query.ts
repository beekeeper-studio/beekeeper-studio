import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { ApplicationEntity  } from './application_entity'

@Entity({ name: 'favorite_query' })
export class FavoriteQuery extends ApplicationEntity {

  @Column({type: "varchar", nullable: false})
  title!: string

  @Column({type: "text", nullable: false})
  text!: string

  @Column("varchar")
  database!: string

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
