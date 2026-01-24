import { TableFilter, TableOrView } from "@/lib/db/models";
import { Transport } from ".";
import _ from "lodash";
import ISavedQuery from "../interfaces/ISavedQuery";
import { JsonValue } from "@/types";
import { LoadViewParams } from "@beekeeperstudio/plugin";

export type PluginTabType = 'plugin-base' | 'plugin-shell';
export type CoreTabType = 'query' | 'table' | 'table-properties' | 'settings' | 'table-builder' | 'backup' | 'import-export-database' | 'restore' | 'import-table' | 'shell'
export type TabType = CoreTabType | PluginTabType

const pickable = ['title', 'tabType', 'unsavedChanges', 'unsavedQueryText', 'tableName', 'schemaName', 'context']

export interface TransportOpenTab<Context = {}> extends Transport {
  tabType: TabType,
  unsavedChanges: boolean,
  title: string,
  titleScope?: string,
  alert: boolean,
  position: number,
  active: boolean,
  queryId?: number,
  usedQueryId?: number,
  unsavedQueryText?: string,
  tableName?: string,
  schemaName?: string,
  entityType?: string,
  connectionId: number,
  workspaceId?: number,
  filters?: string,
  lastActive?: Date|null,
  deletedAt?: Date|null
  isRunning: boolean, // not on the actual model, but used in frontend
  isTransaction: boolean, // not on the actual model, but used in frontend
  context: Context
}

/** Used when creating a new tab */
export type TransportOpenTabInit<Context = {}> = Omit<
  TransportOpenTab<Context>,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "version"
  | "isRunning"
  | "connectionId"
  | "alert"
  | "position"
  | "active"
>;

export type TransportPluginShellTab = TransportOpenTab<PluginTabContext>;
export type TransportPluginTab = TransportOpenTab<PluginTabContext>;

export type PluginTabContext = {
  pluginId: string;
  pluginTabTypeId: string;
  /** A plugin can save the state of the tab here. For example, an AI plugin
     * can save the chat conversation here */
  data?: JsonValue;
  /** The command to execute on the plugin. Plugins cannot change this.
   * @since 5.4.0 */
  command?: string;
  /** Parameters to be passed to the plugin. Plugins cannot change this.
   * @since 5.4.0 */
  params?: LoadViewParams;
};

export namespace TabTypeConfig {
  interface BaseConfig {
    type: TabType;
    name: string;
    /** Used for the dropdown menu next to the "new tab" icon. */
    menuItem?: {
      label: string;
      shortcut?: string;
      /** For plugins */
      command: string;
      /** For plugins */
      params?: LoadViewParams;
    };
  }

  interface CoreConfig extends BaseConfig {
    type: CoreTabType;
  }

  /** `"plugin-shell"` consists of two parts; an iframe at the top and a table at
   * the bottom. This tab looks almost identical to the query tab. The only
   * difference is, in this tab, the result table can be collapsed completely. */
  export interface PluginConfig extends BaseConfig, PluginRef {
    type: PluginTabType;
    icon?: string; // from material-icons
  }

  export interface PluginRef {
    /** Use plugin id from the manifest */
    pluginId: string;
    /** Use view id from the manifest. */
    pluginTabTypeId: string;
  }

  export type Config = CoreConfig | PluginConfig;
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
      return (obj.queryId === other.queryId && obj.queryId !== null && other.queryId !== null) ||
        (obj.usedQueryId === other.usedQueryId && obj.usedQueryId !== null && other.queryId !== null)
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
