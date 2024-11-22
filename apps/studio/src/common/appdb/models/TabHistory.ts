import { Column, Entity, In, JoinColumn, OneToOne } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'
import { TransportTabHistory } from "@/common/transport/TransportTabHistory";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";

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

  @Column({type: 'varchar', nullable: false})
  tabType?: TabType = 'query'

  @Column({type: 'varchar', nullable: true, length: 255})
  title?: string

  @Column({type: 'integer', nullable: false})
  position: number

  @Column({type: 'text', nullable: true})
  unsavedQueryText?: string

  // TABLE TAB
  @Column({type: 'varchar', length: 255, nullable: true})
  tableName?: string

  @Column({type: 'varchar', nullable: true})
  schemaName?: string

  @Column({type: 'varchar', nullable: true})
  entityType?: string

  static async updatePosition(newTab: TransportOpenTab) {
    console.log('updatePosition: ', newTab)
    const tab: TransportTabHistory = await this.findOne({
      where: { tabId: newTab.id }
    })
    let tabHistoryList: TransportTabHistory[] = await this.find({
      where: {
        connectionId: newTab.connectionId,
        workspaceId: newTab.workspaceId
      }
    })
    let tabPosition = -1
    console.log(tab)
    console.log(tabHistoryList)

    if (tabHistoryList.length === 0) {
      console.log('no length!')
      return await this.save({
        tabId: newTab.id,
        connectionId: newTab.connectionId,
        workspaceId: newTab.workspaceId,
        position: 0
      })
    }

    if (tab) {
      tabPosition = tab.position
    } else {
      // @ts-ignore
      tabHistoryList = [{
        tabId: newTab.id,
        connectionId: newTab.connectionId,
        workspaceId: newTab.workspaceId,
        position: -1
      }, ...tabHistoryList]
    }

    const updatedHistoryList = tabHistoryList
      .map((currTab) => {
        if (currTab.position === tabPosition) {
          currTab.position = 0
        } else if (tabPosition === -1 || currTab.position < tabPosition) {
          currTab.position = currTab.position + 1
        }

        return currTab
      })

    const newHistoryList = updatedHistoryList.slice(0, 10)
    const deleteHistoryList = updatedHistoryList
      .slice(10)
      .map(val => val.id)

    console.log(newHistoryList)
      
    await this.save(newHistoryList)
    if (deleteHistoryList.length > 0) {
      await this.delete({ id: In(deleteHistoryList)})
    }
  }

  static async closeTab(deletedTab: TransportOpenTab) {
    console.log(deletedTab)
    // update its position to 1 (see update above steps),  
  }
}

export const TabHistoryHandlers = {
  'appdb/tabhistory/update': async (newTab: TransportOpenTab) => {
    console.log('update stuff')
    await TabHistory.updatePosition(newTab) 
  },
  'appdb/tabhistory/closetab': async (deletedTab: TransportOpenTab) => {
    await TabHistory.closeTab(deletedTab) 
    // update its position to 1 (see update above steps),  
  }
}
