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

  static async closeTab(deletedTab: any): Promise<void> {
    const {0: deletedTabData} = deletedTab 
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

  static async getHistory(connectionIds): Promise<TransportTabHistory[]> {
    const { connectionId, workspaceId } = connectionIds
    console.log(`connectionId: ${connectionId}`)
    console.log(`workspaceId: ${workspaceId}`)
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
    const foundTab: TransportTabHistory = await this.findOne({
      where: { id: historyTab.id }
    })

    const justCreatedTab = await this.findOne({
      where: {
        connectionId: historyTab.connectionId,
        workspaceId: historyTab.workspaceId
      },
      order: {
        createdAt: 'DESC'
      }
    })

    foundTab.tabType = null
    foundTab.title = null
    foundTab.unsavedQueryText = null
    foundTab.tableName = null
    foundTab.schemaName = null
    foundTab.entityType = null
    foundTab.tabId = justCreatedTab.id
    foundTab.updatedAt = new Date()

    this.save(foundTab)
  }
}

export const TabHistoryHandlers = {
  'appdb/tabhistory/update': async (newTab: TransportOpenTab): Promise<void> => {
    console.log('update stuff')
    await TabHistory.updateLastActive(newTab) 
  },
  'appdb/tabhistory/closetab': async (deletedTab: TransportOpenTab): Promise<void> => {
    await TabHistory.closeTab(deletedTab) 
  },
  'appdb/tabhistory/get': async (connectionIds): Promise<TransportTabHistory[]> => {
    console.log('~~ get tab history ~~')
    return await TabHistory.getHistory(connectionIds) 
  },
  'appdb/tabhistory/reopenedtab': async (historyTab: TransportOpenTab): Promise<void> => {
    console.log('~~ get tab history ~~')
    await TabHistory.reopenedtab(historyTab) 
  }
}
