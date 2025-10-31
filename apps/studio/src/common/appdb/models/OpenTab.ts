import _ from 'lodash'
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { TableFilter, TableOrView } from "@/lib/db/models";
import { Column, Entity, LessThan, Not, IsNull, DeleteDateColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { TabType, TransportOpenTab } from "@/common/transport/TransportOpenTab";


const pickable = ['title', 'tabType', 'unsavedChanges', 'unsavedQueryText', 'tableName', 'schemaName', 'entityType', 'titleScope', 'connectionId', 'workspaceId', 'position']

interface ConnectionIds {
  connectionId: number,
  workspaceId: number
}

@Entity({ name: 'tabs'})
export class OpenTab extends ApplicationEntity {
  withProps(init: TabType | TransportOpenTab): OpenTab {
    if (_.isString(init)) {
      this.tabType = init
      return this;
    }
    OpenTab.merge(this, init)
    return this;
  }

  get type(): TabType {
    return this.tabType
  }

  @Column({type: 'varchar', nullable: false})
  tabType: TabType = 'query'

  @Column({type: 'boolean', nullable: false, default: false})
  unsavedChanges = false

  @Column({type: 'varchar', nullable: false, length: 255})
  title: string

  @Column({type: 'varchar', nullable: true})
  titleScope?: string

  @Column({type: 'boolean', default: false})
  alert = false

  @Column({type: 'float', nullable: false})
  position = 99.0

  @Column({type: 'boolean', nullable: false, default: false})
  active: boolean

  // QUERY TAB
  @Column({ type: 'integer', nullable: true })
  queryId?: number

  @Column({ type: 'integer', nullable: true })
  usedQueryId?: number

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

  @Column({type: 'text', name: 'filters', nullable: true})
  filters?: string
  isRunning = false;

  @Column({type: 'json', nullable: true})
  /** Context is a generic object. It can be used to store anything. */
  context: any

  /**
   * Auto-generated from context.pluginId. Do not set this column directly.
   * Instead, set the pluginId in the context object: `tab.context = { pluginId: 'your-plugin-id' }`
   * This column is automatically synced on insert/update via @BeforeInsert and @BeforeUpdate hooks.
   */
  @Column({type: 'text', nullable: true})
  generatedPluginId?: string

  @Column({type: 'datetime', nullable: true})
  lastActive?: Date

  @DeleteDateColumn()
  deletedAt?: Date

  @BeforeInsert()
  @BeforeUpdate()
  private syncPluginId() {
    if (this.context?.pluginId) {
      this.generatedPluginId = this.context.pluginId;
    } else {
      this.generatedPluginId = null;
    }
  }

  public setFilters(filters: Nullable<TableFilter[]>) {
    if (filters && _.isArray(filters)) {
      this.filters = JSON.stringify(filters)
    } else {
      this.filters = null
    }
  }

  public getFilters(): Nullable<TableFilter[]> {
    try {
      if (!this.filters) return null
      const result: TableFilter | TableFilter[] = JSON.parse(this.filters)
      if (_.isArray(result)) return result
      if (_.isObject(result)) return [result]
      return null
    } catch (ex) {
      console.warn("error inflating filter", this.filters)
      return null
    }
  }


  isBeta(): boolean {
    const betaTypes = ['backup', 'import-export-database', 'restore', 'import-table'];

    return betaTypes.includes(this.tabType);
  }

  duplicate(): OpenTab {
    const result = new OpenTab().withProps(this.tabType);
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
    if (other.workspaceId && this.workspaceId && this.workspaceId !== other.workspaceId) {
      return false;
    }

    switch (other.tabType) {
      case 'table-properties':
        return this.tableName === other.tableName &&
        (this.schemaName || null) === (other.schemaName || null) &&
        (this.entityType || null) === (other.entityType || null) &&
        (this.tabType || null) === (other.tabType || null)
      case 'table':
        return this.tableName === other.tableName &&
          (this.schemaName || null) === (other.schemaName || null) &&
          (this.entityType || null) === (other.entityType || null)
      case 'import-export-database':
        // we store export state in the store, so don't want multiple open
        // at a time.
        return this.tabType === 'import-export-database'
      case 'query':
        return this.queryId === other.queryId
      case 'backup':
        return this.tabType === 'backup';
      case 'restore':
        return this.tabType === 'restore';
      case 'import-table':
        return this.tabType === 'import-table' &&
        this.tableName === other.tableName &&
        (this.schemaName || null) === (other.schemaName || null);
      default:
        return false
    }
  }

  static async getHistory(connectionIds: ConnectionIds, limit = 10): Promise<TransportOpenTab[]> {
    const { connectionId, workspaceId } = connectionIds
    return await this.find({
      where: {
        connectionId,
        workspaceId
      },
      order: {
        lastActive: 'DESC'
      },
      take: limit,
      withDeleted: true
    })
  }

  static async clearOldDeletedTabs(connectionIds: ConnectionIds, xDays: number): Promise<void> {
    const { connectionId, workspaceId } = connectionIds
    const deletedAtThreshold = new Date()
    deletedAtThreshold.setDate(deletedAtThreshold.getDate() - xDays)

    await this.delete({
      connectionId,
      workspaceId,
      deletedAt: LessThan(deletedAtThreshold)
    })
  }

  static async getClosedHistory(connectionIds: ConnectionIds): Promise<TransportOpenTab> {
    const { connectionId, workspaceId } = connectionIds
    return await this.findOne({
          where: {
            deletedAt: Not(IsNull()),
            connectionId,
            workspaceId
          },
          order: {
            deletedAt: 'DESC'
          },
          withDeleted: true
        })
  }
}
