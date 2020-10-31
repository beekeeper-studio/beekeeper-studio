import { FavoriteQuery } from "common/appdb/models/favorite_query";
import { DBConnection, IDbColumn } from '../lib/db/client'

export interface IDbEntityWithColumns {
  columns: IDbColumn[]
}


export enum TabType {
  query = 'query', table = 'table', settings = 'settings'
}

interface Tab {
  id: string,
  type: TabType
}

export interface QueryTab extends Tab {
  title: string
  connection: any,
  query: FavoriteQuery,
  unsavedChanges?: boolean,
}

export interface TableTab extends Tab {
  table: IDbEntityWithColumns,
  connection: any,
  initialFilter: any,
  titleScope: string
}

export type CoreTab = QueryTab | TableTab