import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { TableFilter, TableOrView } from "@/lib/db/models";
import { Column, Entity } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'


type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder'


const pickable = ['title', 'tabType', 'unsavedChanges', 'unsavedQueryText', 'tableName', 'schemaName']


@Entity({ name: 'tabs'})
export class OpenTab extends ApplicationEntity {


  constructor(tabType: TabType) {
    super()
    this.tabType = tabType
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
  workspaceId?: number

  @Column({type: 'simple-array', nullable: true})
  filters?: TableFilter[]

  duplicate(): OpenTab {
    const result = new OpenTab(this.tabType)
    _.assign(result, _.pick(this, pickable))
    return result
  }

  findTable(tables: TableOrView[]): TableOrView | null {
    const result = tables.find((t) => {
      return this.tableName === t.name &&
        (!this.schemaName || this.schemaName === t.schema)
    })
    return result
  }

  findQuery(queries: ISavedQuery[]): ISavedQuery | null {
    return queries.find((q) => q.id === this.queryId)
  }

  // we want a loose match here, this is used to determine if we open a new tab or not
  matches(other: OpenTab): boolean {
    // new tabs don't have a workspace set
    console.log("comparison matches", this.tableName, this.schemaName, this.filters, this.entityType)
    if (other.workspaceId && this.workspaceId && this.workspaceId !== other.workspaceId) {
      return false;
    }
    switch (other.tabType) {
      case 'table-properties':
        return this.tableName === other.tableName &&
        (this.schemaName || null) === (other.schemaName || null) &&
        (this.entityType || null) === (other.entityType || null)
      case 'table':
        return false
        // we just want false for now as filters aren't properly saved.
        // return this.tableName === other.tableName &&
        //   (this.schemaName || null) === (other.schemaName || null) &&
        //   (this.entityType || null) === (other.entityType || null) &&
        //   _.isEqual(this.filters, other.filters)
      case 'query':
        return this.queryId === other.queryId
      default:
        return false
    }
  }

}