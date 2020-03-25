import { Entity, Column, Index } from 'typeorm'
import { ApplicationEntity  } from './application_entity'

@Entity({ name: 'used_query'})
export class UsedQuery extends ApplicationEntity {


  @Column({type: "text", nullable: false})
  text

  @Column("varchar")
  database

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash

  @Column('varchar')
  status = 'pending'

  @Column({ type:'bigint', nullable: true})
  numberOfRecords

}
