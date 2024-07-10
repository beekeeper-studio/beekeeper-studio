import { DatabaseEntity } from "@/lib/db/models";
import { IConnection } from "../interfaces/IConnection";


type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table'

// anything that is transferred to the utility process should implement this interface
// may need to add more in the future, this is just to make type stuff 
export interface Transport {
  id: number | null
  createdAt: Date,
  updatedAt: Date,
  version: number
}

export interface TransportPinnedConn extends Transport {
  position: number;
  connectionId: number;
  workspaceId: number;
  connection: IConnection;
}

export interface TransportPinnedEntity extends Transport {
  databaseName: string,
  schemaName?: string,
  entityName: string,
  entityType: 'table' | 'view' | 'routine' | 'materialized-view',
  open: boolean,
  position: number,
  connectionId: number,
  workspaceId: number,
  entity: DatabaseEntity
}

export interface TransportFavoriteQuery extends Transport {
  title: string;
  text: string;
  database: string | null;
  connectionHash: string;
}

export interface TransportUsedQuery extends Transport {
  text: string;
  database: string;
  connectionHash: string;
  status: string;
  numberOfRecords?: BigInt;
  workspaceId: number;
}

export interface TransportOpenTab extends Transport {
  tabType: TabType,
  unsavedChanges: boolean,
  title: string,
  titleScope?: string,
  alert: boolean,
  position: number,
  active: boolean,
  queryId?: number,
  unsavedQueryText?: string,
  tableName?: string,
  schemaName?: string,
  entityType?: string,
  connectionId: number,
  workspaceId?: number,
  filters?: string,
  isRunning: boolean, // not on the actual model, but used in frontend
}
