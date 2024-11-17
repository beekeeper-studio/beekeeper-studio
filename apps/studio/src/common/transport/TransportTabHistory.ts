import { Transport } from ".";
import _ from "lodash";
type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table'

export interface TransportTabHistory extends Transport {
  tabId?: number
  connectionId: number
  workspaceId?: number
  tabType?: TabType
  title?: string
  position: number
  unsavedQueryText?: string 
  tableName?: string
  schemaName?: string
  entityType?: string
}
