import { QueryLike } from '../common/appdb/models/base'
import { TableColumn } from "../lib/db/models"



export interface IDbEntityWithColumns {
  name: string
  entityType: 'table' | 'view' | 'materialized-view'
  columns: TableColumn[]
  schema?: string
}

export interface EntityFilter {
  filterQuery?: string
  showTables: boolean
  showViews: boolean
  showRoutines: boolean
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
  query: QueryLike,
  unsavedChanges?: boolean,
}

export interface TableTab extends Tab {
  table: IDbEntityWithColumns,
  connection: any,
  initialFilter: any,
  titleScope: string
}

export type CoreTab = QueryTab | TableTab