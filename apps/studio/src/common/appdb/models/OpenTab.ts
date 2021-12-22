import { TableFilter, TableOrView } from "@/lib/db/models";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";



type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder'


const pickable = ['title', 'tabType', 'unsavedChanges', 'unsavedQueryText', 'tableName', 'schemaName']


@Entity({ name: 'tabs'})
export class OpenTab extends ApplicationEntity {


  constructor(options = {}) {
    super()
    _.assign(this, _.pick(options, pickable))
  }

  get type() {
    return this.tabType
  }

  @Column({type: 'varchar', nullable: false})
  tabType: TabType = 'query'

  @Column({type: 'boolean', nullable: false, default: false})
  unsavedChanges: boolean = false

  @Column({type: 'varchar', nullable: false, length: 255})
  title: string

  @Column({type: 'varchar', nullable: true})
  titleScope?: string

  @Column({type: 'boolean', default: false})
  alert: boolean = false

  @Column({type: 'float', nullable: false})
  position: number = 99.0

  @Column({type: 'boolean', nullable: false, default: false})
  active: boolean

  // QUERY TAB
  @Column({ type: 'integer', nullable: true })
  queryId?: number

  @Column({type: 'text', nullable: true})
  unsavedQueryText?: string

  // TABLE TAB
  @Column({type: 'varchar', length: 255, nullable: true})
  tableName?: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: true})
  entityType?: string

  @Column({ type: 'integer', nullable: false })
  connectionId

  @Column({ type: 'integer', nullable: false, default: -1 })
  workspaceId: number = -1

  @Column({type: 'text', nullable: true, default: "[]"})
  filters: TableFilter[]

  duplicate(): OpenTab {
    return new OpenTab(this)
  }

  findTable(tables: TableOrView[]): TableOrView | null {
    const result = tables.find((t) => {
      return this.tableName === t.name &&
        (!this.schemaName || this.schemaName === t.schema)
    })
    return result
  }

}