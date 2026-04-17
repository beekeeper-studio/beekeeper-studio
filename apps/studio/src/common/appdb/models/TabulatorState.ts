import { Column, Entity, Index } from 'typeorm'
import { ApplicationEntity } from './application_entity'
import { TransportTabulatorState } from '@/common/transport/TransportTabulatorState'

@Entity({ name: 'tabulator_state' })
@Index(['workspaceId', 'connectionId', 'schema', 'table'], { unique: true })
export class TabulatorState extends ApplicationEntity implements TransportTabulatorState {
  withProps(props?: Partial<TransportTabulatorState>): TabulatorState {
    if (props) TabulatorState.merge(this, props)
    return this
  }

  @Column({ type: 'int', nullable: false, default: -1 })
  workspaceId = -1

  @Column({ type: 'int', nullable: false })
  connectionId: number

  @Column({ type: 'varchar', nullable: false, default: '' })
  schema = ''

  @Column({ type: 'varchar', nullable: false })
  table: string

  @Column({ type: 'json' })
  value: any
}
