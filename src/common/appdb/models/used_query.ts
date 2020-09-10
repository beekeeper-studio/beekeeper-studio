import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { ApplicationEntity  } from './application_entity'

@Entity({ name: 'used_query'})
export class UsedQuery extends ApplicationEntity {
  @Column({type: "text", nullable: false})
  text!: string

  @Column("varchar")
  database!: string

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash = 'DEPRECATED'

  @Column('varchar')
  status = 'pending'

  @Column({ type:'bigint', nullable: true})
  numberOfRecords?: BigInt

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
