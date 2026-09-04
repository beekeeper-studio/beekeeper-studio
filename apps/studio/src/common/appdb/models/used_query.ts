import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm'
import { IsInt, MaxLength, Min } from 'class-validator';
import { ApplicationEntity  } from './application_entity'
import type { QueryOrigin } from '../../interfaces/QueryOrigin'

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
  numberOfRecords?: bigint

  @Column({ type: 'integer', nullable: false, default: -1 })
  workspaceId = -1

  @IsInt({ message: 'connectionId must be a saved connection id' })
  @Min(1, { message: 'connectionId must be a saved connection id' })
  @Column({ type: "integer", nullable: false, default: -1 })
  connectionId = -1

  @Column({ type: 'varchar', nullable: false, default: 'app' })
  origin: QueryOrigin = 'app'

  @Column({ type: 'varchar', nullable: true })
  pluginId?: string | null

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
