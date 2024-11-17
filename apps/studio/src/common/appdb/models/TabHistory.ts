import { Column, Entity, OneToOne, JoinColumn } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash'
import { TransportTabHistory } from "@/common/transport/TransportTabHistory";
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

  @OneToOne(() => OpenTab)
  @JoinColumn()
  tab: OpenTab

  async updatePosition(newTab: OpenTab) {
    console.log(newTab)
    // get all tabs that match the newTab's connectionId
    // see if it exists in the list.
    //   If it's there, save the position it was, set to 0, reorder the others, then make it position 1 
    // new 
    // if less than 10, reorder everything
    // if more than 10, delete the last one in the list and 
  }

  async closeTab(deletedTab: OpenTab) {
    console.log(deletedTab)
    // update its position to 1 (see update above steps),  
  }
}

export const TabHistoryHandlers = {
  'appdb/tabhistory/update': async (newTab: OpenTab) => {
    const th = new TabHistory()
    await th.updatePosition(newTab) 
  },
  'appdb/tabhistory/closetab': async (deletedTab: OpenTab) => {
    const th = new TabHistory()
    await th.closeTab(deletedTab) 
    // update its position to 1 (see update above steps),  
  }
}
