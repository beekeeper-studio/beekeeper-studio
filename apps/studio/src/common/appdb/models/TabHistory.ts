import { Column, Entity, In, JoinColumn, OneToOne } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'
import { TransportTabHistory } from "@/common/transport/TransportTabHistory";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import { OpenTab } from "./OpenTab";

type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table';

@Entity({ name: 'tab_history'})
export class TabHistory extends ApplicationEntity {
  withProps(init: TabType | TransportTabHistory): TabHistory {
    if (_.isString(init)) {
      this.tabType = init
      return this;
    }
    TabHistory.merge(this, init)
    return this;
  }

  get type(): TabType {
    return this.tabType
  }

  @Column({ type: 'integer', nullable: false })
  connectionId

  @Column({ type: 'integer', nullable: false, default: -1 })
  workspaceId?: number

  @Column({ type: 'integer', nullable: true })
  tabId?: number

  @OneToOne(() => OpenTab)
  @JoinColumn({ name: 'tabId' })
  tabDetails: OpenTab

  @Column({type: 'varchar', nullable: false})
  tabType?: TabType = 'query'

  @Column({type: 'varchar', nullable: true, length: 255})
  title?: string

  @Column({type: 'datetime', nullable: false})
  lastActive: Date

  @Column({type: 'text', nullable: true})
  unsavedQueryText?: string

  // TABLE TAB
  @Column({type: 'varchar', length: 255, nullable: true})
  tableName?: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: true})
  entityType?: string

  static async trimTable(newTab): Promise<void> {
    const tabHistoryList: TransportTabHistory[] = await this.find({
      where: {
        connectionId: newTab.connectionId,
        workspaceId: newTab.workspaceId
      },
      order: {
        lastActive: 'DESC'
      }
    })

    const deleteHistoryList = tabHistoryList
      .slice(10)
      .map(val => val.id)

    if (deleteHistoryList.length > 0) {
      await this.delete({ id: In(deleteHistoryList)})
    }
  }

  static async updateLastActive(newTab: TransportOpenTab): Promise<void> {
    const tab: TransportTabHistory = await this.findOne({
      where: { tabId: newTab.id }
    })

    if (!tab) {
      await this.save({
        tabId: newTab.id,
        connectionId: newTab.connectionId,
        workspaceId: newTab.workspaceId,
        lastActive: new Date()
      })
    } else {
      tab.lastActive = new Date()
      await this.save(tab)
    }

    this.trimTable(newTab)
  }

  static async closeTab(deletedTab): Promise<void> {
    let dt
    for (const prop in deletedTab) {
      if (_.isNaN(prop)) continue 
      const deletedTabData = deletedTab[prop]
      dt = deletedTabData
      const closedTab: TransportTabHistory = await this.findOneBy({ tabId: deletedTabData.id })
      await this.save({
        ...closedTab,
        ...{
          tabId: null,
          tabType: deletedTabData.tabType ?? null,
          title: deletedTabData.title ?? null,
          unsavedQueryText: deletedTabData.unsavedQueryText ?? null, 
          tableName: deletedTabData.tableName ?? null,
          schemaName: deletedTabData.schemaName ?? null,
          entityType: deletedTabData.entityType ?? null,
          lastActive: new Date()
        }
      })
    }

    this.trimTable(dt)
  }

  static async getHistory(connectionIds): Promise<TransportTabHistory[]> {
    const { connectionId, workspaceId } = connectionIds
    return await this.find({
      where: {
        connectionId,
        workspaceId
      },
      order: {
        lastActive: 'DESC'
      },
      relations: ['tabDetails']
    })
  }

  static async reopenedtab(historyTab) {
    const { historyTabId } = historyTab
    try {
      await this.delete({ id: historyTabId })
    } catch (err) {
      console.error(err)
    }
  }
}

export const TabHistoryHandlers = {
  'appdb/tabhistory/update': async (newTab: TransportOpenTab): Promise<void> => {
    await TabHistory.updateLastActive(newTab) 
  },
  'appdb/tabhistory/closetab': async (deletedTabs: TransportOpenTab): Promise<void> => {
    await TabHistory.closeTab(deletedTabs) 
  },
  'appdb/tabhistory/get': async (connectionIds): Promise<TransportTabHistory[]> => {
    return await TabHistory.getHistory(connectionIds) 
  },
  'appdb/tabhistory/reopenedtab': async (historyTabId): Promise<void> => {
    await TabHistory.reopenedtab(historyTabId) 
  }
}
