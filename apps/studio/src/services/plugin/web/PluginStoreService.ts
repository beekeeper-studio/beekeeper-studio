import type { Store } from "vuex";
import { State as RootState } from "@/store";
import type {
  PluginTabContext,
  TabTypeConfig,
  TransportOpenTab,
  TransportOpenTabInit,
} from "@/common/transport/TransportOpenTab";
import { DatabaseType } from "@beekeeperstudio/plugin";
import { findTable, PluginTabType } from "@/common/transport/TransportOpenTab";
import { AppEvent } from "@/common/AppEvent";
import { ExtendedTableColumn, NgQueryResult, TableOrView } from "@/lib/db/models";
import _ from "lodash";
import { SidebarTab } from "@/store/modules/SidebarModule";
import {
  Manifest,
  PluginMenuItem,
  PluginView,
  TabType,
  CreatePluginTabOptions,
} from "../types";
import { ExternalMenuItem, JsonValue } from "@/types";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { isManifestV0, mapViewsAndMenuFromV0ToV1 } from "../utils";
import { cssVars } from "./cssVars";
import type { DialectData } from "@/shared/lib/dialects/models";

type Table = {
  name: string;
  schema?: string;
};

/** An interface that bridges plugin system with Vuex and AppEvents. */
export default class PluginStoreService {
  private tablesChangedListeners: Set<() => void> = new Set();

  constructor(
    private store: Store<RootState>,
    public appEventBus: {
      emit: (event: AppEvent, ...args: any) => void;
      on: (event: AppEvent, listener: (...args: any) => void) => void;
      off: (event: AppEvent, listener: (...args: any) => void) => void;
    }
  ) {
    this.store.subscribe((mutation) => {
      if (mutation.type === "tables") {
        this.tablesChangedListeners.forEach((listener) => listener());
      }
    })
  }

  on(name: 'tablesChanged', listener: () => void) {
    this.tablesChangedListeners.add(listener);
    return () => this.tablesChangedListeners.delete(listener);
  }

  off(name: 'tablesChanged', listener: () => void) {
    this.tablesChangedListeners.delete(listener);
  }

  getTheme()  {
    const styles = getComputedStyle(this.getAppEl());
    /** Key = css property, value = css value */
    const palette: Record<string, string> = {};

    for (const name of cssVars) {
      const camelKey = _.camelCase(name);
      palette[camelKey] = styles.getPropertyValue(name).trim();
    }

    const cssString = cssVars
      .map((cssProp) => `${cssProp}: ${palette[_.camelCase(cssProp)]};`)
      .join("");

    return {
      type: this.store.getters["settings/themeType"],
      palette,
      cssString,
    };
  }

  addSidebarTab(tab: SidebarTab): void {
    this.store.commit("sidebar/addSecondarySidebar", tab);
  }

  removeSidebarTab(id: string): void {
    this.store.commit("sidebar/removeSecondarySidebar", id);
  }

  /** @deprecated use `addTabTypeConfigs` or `setTabDropdownItem` instead */
  addTabTypeConfigV0(params: {
    pluginId: string;
    pluginTabTypeId: string;
    name: string;
    kind: TabType;
    icon?: string;
  }): void {
    const config: TabTypeConfig.PluginConfig = {
      type: `plugin-${params.kind}` as const,
      name: params.name,
      pluginId: params.pluginId,
      pluginTabTypeId: params.pluginTabTypeId,
      menuItem: { label: `Add ${params.name}` },
      icon: params.icon,
    };
    this.store.commit("tabs/addTabTypeConfig", config);
  }

  /** @deprecated use `removeTabTypeConfigs` or `unsetTabDropdownItem` instead */
  removeTabTypeConfigV0(
    identifier: TabTypeConfig.PluginRef
  ): void {
    this.store.commit("tabs/removeTabTypeConfig", identifier);
  }

  /** Register plugin views as tabs */
  addTabTypeConfigs(manifest: Manifest, views: PluginView[]): void {
    views.forEach((view) => {
      const ref: TabTypeConfig.PluginRef = {
        pluginId: manifest.id,
        pluginTabTypeId: view.id,
      };
      const type: PluginTabType = view.type.includes("shell")
        ? "plugin-shell"
        : "plugin-base";
      const config: TabTypeConfig.PluginConfig = {
        ...ref,
        type,
        name: manifest.name,
        icon: manifest.icon,
      };
      this.store.commit("tabs/addTabTypeConfig", config);
    });
  }

  removeTabTypeConfigs(manifest: Manifest, views: PluginView[]): void {
    views.forEach((view) => {
      const ref: TabTypeConfig.PluginRef = {
        pluginId: manifest.id,
        pluginTabTypeId: view.id,
      };
      this.store.commit("tabs/removeTabTypeConfig", ref);
    })
  }

  setTabDropdownItem(options: {
    menuItem: PluginMenuItem;
    manifest: Manifest;
  }): void {
    const ref: TabTypeConfig.PluginRef = {
      pluginId: options.manifest.id,
      pluginTabTypeId: options.menuItem.view,
    };
    const menuItem: TabTypeConfig.PluginConfig['menuItem'] = {
      label: options.menuItem.name,
      command: options.menuItem.command,
    }
    this.store.commit("tabs/setMenuItem", { ...ref, menuItem });
  }

  unsetTabDropdownItem(options: {
    menuItem: PluginMenuItem;
    manifest: Manifest;
  }): void {
    const ref: TabTypeConfig.PluginRef = {
      pluginId: options.manifest.id,
      pluginTabTypeId: options.menuItem.view,
    };
    this.store.commit("tabs/unsetMenuItem", ref);
  }

  getTables(schema?: string): Table[] {
    const allTables = this.store.state.tables;

    const dialect: DialectData = this.store.getters.dialectData;
    if (dialect.disabledFeatures?.schema) {
      return allTables;
    }

    const tables: Table[] = [];
    // If no schema is provided, use the default schema
    const effectiveSchema = typeof schema === "undefined"
      ? this.store.state.defaultSchema
      : schema;

    for (const table of allTables) {
      if (table.schema && table.schema === effectiveSchema) {
        tables.push({
          name: table.name,
          schema: table.schema,
        });
      }
    }
    return tables;
  }

  private findTable(name: string, schema?: string) {
    return this.store.state.tables.find((t) => {
      if (!schema && this.store.state.defaultSchema) {
        schema = this.store.state.defaultSchema;
      }
      if (schema) {
        return t.name === name && t.schema === schema;
      }
      return t.name === name;
    });
  }

  /** @throws {Error} Not found */
  private findTableOrThrow(name: string, schema?: string) {
    const table = this.findTable(name, schema);
    if (!table) {
      throw new Error(schema ? `Table not found (table=${name}, schema=${schema})` : `Table not found (table=${name})`);
    }
    return table;
  }

  async getColumns(
    tableName: string,
    schema?: string
  ) {
    const table = this.findTableOrThrow(tableName, schema);

    if (!table.columns || table.columns.length === 0) {
      await this.store.dispatch("updateTableColumns", table);
    }

    return this.findTable(tableName, schema).columns.map((c: ExtendedTableColumn) => ({
      name: c.columnName,
      type: c.dataType,
      comment: c.comment ?? "",
      nullable: c.nullable ?? false,
      defaultValue: c.defaultValue,
      extra: c.extra ?? "",
      generated: c.generated ?? false,
      ordinalPosition: c.ordinalPosition,
    }));
  }

  getConnectionInfo() {
    return {
      id: this.store.state.usedConfig.id,
      workspaceId: this.store.state.workspaceId,
      connectionName: this.store.state.usedConfig.name || "",
      connectionType: this.store.state.connectionType,
      databaseType: this.store.state.connectionType as DatabaseType,
      databaseName: this.store.state.database,
      defaultSchema: this.store.state.defaultSchema,
      readOnlyMode: this.store.state.usedConfig.readOnlyMode,
    };
  }

  serializeTab(tab: TransportOpenTab) {
    if (tab.tabType === "query") {
      return {
        type: "query",
        id: tab.id,
        title: tab.title,
        data: {
          query: tab.unsavedQueryText,
          result: null,
        },
      };
    } else if (tab.tabType === "table") {
      return {
        type: "table",
        id: tab.id,
        title: tab.title,
        data: {
          table: findTable(tab, this.store.state.tables),
          filters: [], // FIXME
          result: null, // FIXME
        },
      };
    }

    return {
      type: tab.tabType,
      id: tab.id,
      title: tab.title,
    };
  }

  private serializeQueryResponse(result: NgQueryResult) {
    return {
      fields: result.fields.map((field) => ({
        id: field.id,
        name: field.name,
        dataType: field.dataType,
      })),
      rows: result.rows,
      rowCount: result.rowCount,
      affectedRows: result.affectedRows,
    };
  }

  /* Run query in the background */
  async runQuery(query: string) {
    const results = await this.store.state.connection.executeQuery(query);

    return {
      results: results.map(this.serializeQueryResponse),
    };
  }

  createPluginTab(options: CreatePluginTabOptions) {
    const transport = this.buildPluginTabInit(options);
    this.appEventBus.emit(AppEvent.newCustomTab, transport);
  }

  openTab(options: OpenTabRequest['args']): void {
    if (options.type === "query") {
      if (!options.query) {
        this.appEventBus.emit(AppEvent.newTab)
      } else {
        this.appEventBus.emit(AppEvent.newTab, options.query)
      }
      return;
    }

    if (options.type === "tableStructure") {
      const table = this.findTableOrThrow(options.table, options.schema);
      this.appEventBus.emit(AppEvent.openTableProperties, { table });
      return;
    }

    if (options.type === "tableTable") {
      const table = this.findTableOrThrow(options.table, options.schema);
      this.appEventBus.emit(AppEvent.loadTable, {
        table,
        filters: options.filters,
      });
      return;
    }

    throw new Error(`Unsupported tab type: ${options.type}`);
  }

  addPopupMenuItem(menuId: string, item: ContextOption) {
    this.store.commit("popupMenu/add", { menuId, item });
  }

  removePopupMenuItem(menuId: string, slug: string) {
    this.store.commit("popupMenu/remove", { menuId, slug });
  }

  addMenuBarItem(item: ExternalMenuItem<PluginTabContext>) {
    this.store.commit("menuBar/add", item);
  }

  removeMenuBarItem(id: string) {
    this.store.commit("menuBar/remove", id);
  }

  buildPluginTabInit(
    options: CreatePluginTabOptions
  ): TransportOpenTabInit<PluginTabContext> {
    // FIXME(azmi): duplicated code from CoreTabs.vue
    const tabItems = this.store.getters["tabs/sortedTabs"];
    let title = options.manifest.name;
    let tNum = 0;
    do {
      tNum = tNum + 1;
      title = `${options.manifest.name} #${tNum}`;
    } while (tabItems.filter((t) => t.title === title).length > 0);

    const views = isManifestV0(options.manifest)
      ? mapViewsAndMenuFromV0ToV1(options.manifest).views
      : options.manifest.capabilities.views;
    const view = views.find((v) => v.id === options.viewId);
    const tabType: PluginTabType = view.type.includes("shell")
      ? "plugin-shell"
      : "plugin-base";

    return {
      tabType,
      title: options.manifest.name,
      unsavedChanges: false,
      context: {
        pluginId: options.manifest.id,
        pluginTabTypeId: options.viewId,
        params: options.params,
        command: options.command,
      },
    };
  }

  private getAppEl() {
    return document.body.querySelector('.beekeeper-studio-wrapper');
  }
}
