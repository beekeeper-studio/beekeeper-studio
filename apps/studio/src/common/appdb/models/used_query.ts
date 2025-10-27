import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { MaxLength } from 'class-validator';
import { ApplicationEntity  } from './application_entity'

@Entity({ name: 'used_query'})
export class UsedQuery extends ApplicationEntity {
  withProps(props?: any): UsedQuery {
    if (props) UsedQuery.merge(this, props);
    return this;
  }

  @MaxLength(2_000_000, { message: `Queries have a max length of 2,000,000 characters.` })
  @Column({type: "text", nullable: false, select: false})
  text!: string

  @Column({type: 'text'})
  excerpt: string

  @Column("varchar")
  database!: string

  @Index()
  @Column({type: "varchar", nullable: false})
  connectionHash = 'DEPRECATED'

  @Column('varchar')
  status = 'pending'

  @Column({ type:'bigint', nullable: true})
  numberOfRecords?: BigInt

  @Column({ type: 'integer', nullable: false, default: -1 })
  workspaceId = -1

  @Column({ type: "integer", nullable: false, default: -1 })
  connectionId = -1

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
