import { Transport } from ".";
import _ from "lodash";
type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table'

export interface TransportTabHistory extends Transport {
  tabId?: number | null
  connectionId: number
  workspaceId?: number | null
  tabType?: TabType | null
  title?: string | null
  lastActive: Date
  unsavedQueryText?: string | null 
  tableName?: string | null
  schemaName?: string | null
  entityType?: string | null
}
