import { TableFilter, TableOrView } from "@/lib/db/models";
import { Transport } from ".";
import _ from "lodash";
import ISavedQuery from "../interfaces/ISavedQuery";

type TabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table'

const pickable = ['title', 'tabType', 'unsavedChanges', 'unsavedQueryText', 'tableName', 'schemaName']

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

export function setFilters(obj: TransportOpenTab, filters: Nullable<TableFilter[]>) {
  if (filters && _.isArray(filters)) {
    obj.filters = JSON.stringify(filters);
  } else {
    obj.filters = null;
  }
  // for safety
  return obj;
}

export function getFilters(obj: TransportOpenTab): Nullable<TableFilter[]> {
  try {
    if (!obj.filters) return null;
    const result: TableFilter | TableFilter[] = JSON.parse(obj.filters);
    if (_.isArray(result)) return result;
    if (_.isObject(result)) return [result];
  } catch (ex) {
    console.warn("error inflating filter", obj.filters);
  }
  return null;
}

export function isBeta(obj: TransportOpenTab): boolean {
  const betaTypes = ['backup', 'import-export-database', 'restore', 'import-table'];

  return betaTypes.includes(obj.tabType);
}

export function duplicate(obj: TransportOpenTab): TransportOpenTab {
  const result = {} as TransportOpenTab;
  result.tabType = obj.tabType;
  _.assign(result, _.pick(obj, pickable))
  return result;
}

export function findTable(obj: TransportOpenTab, tables: TableOrView[]): TableOrView | null {
  const result = tables.find((t) => {
    return obj.tableName === t.name &&
      (!obj.schemaName || obj.schemaName === t.schema);
  });
  return result;
}

export function findQuery(obj: TransportOpenTab, queries: ISavedQuery[]): ISavedQuery | null {
  return queries.find((q) => q.id === obj.queryId);
}

// we want a loose match here, this is used to determine if we open a new tab or not
export function matches(obj: TransportOpenTab, other: TransportOpenTab): boolean {
  // new tabs don't have a workspace set
  if (other.workspaceId && obj.workspaceId && obj.workspaceId !== other.workspaceId) {
    return false;
  }

  switch (other.tabType) {
    case 'table-properties': 
      return obj.tableName === other.tableName &&
        (obj.schemaName || null) === (other.schemaName || null) &&
        (obj.entityType || null) === (other.entityType || null) &&
        (obj.tabType || null) === (other.tabType || null);
    case 'table':
      return obj.tableName === other.tableName &&
        (obj.schemaName || null) === (other.schemaName || null) &&
        (obj.entityType || null) === (other.entityType || null);
    case 'import-export-database':
      // we store export state in the store, so don't want multiple open
      // at a time.
      return obj.tabType === 'import-export-database'
    case 'query':
      return obj.queryId === other.queryId
    case 'backup':
      return obj.tabType === 'backup';
    case 'restore':
      return obj.tabType === 'restore';
    case 'import-table':
      return obj.tabType === 'import-table' &&
      obj.tableName === other.tableName &&
      (obj.schemaName || null) === (other.schemaName || null);
    default:
      return false
  }
}
