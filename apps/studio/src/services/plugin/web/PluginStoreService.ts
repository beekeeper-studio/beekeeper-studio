import type { Store } from "vuex";
import { State as RootState } from "@/store";
import type {
  TabTypeConfig,
  TransportOpenTab,
} from "@/common/transport/TransportOpenTab";
import {
  GetAllTabsResponse,
  GetColumnsResponse,
  GetConnectionInfoResponse,
  GetTablesResponse,
  OpenQueryTabRequest,
  OpenTabRequest,
  RunQueryResponse,
  TabResponse,
  ThemeChangedNotification,
} from "@beekeeperstudio/plugin";
import { findTable, PluginTabType } from "@/common/transport/TransportOpenTab";
import { AppEvent } from "@/common/AppEvent";
import { NgQueryResult } from "@/lib/db/models";
import _ from "lodash";
import { SidebarTab } from "@/store/modules/SidebarModule";
import { TabType } from "../types";

/**
 * Service that provides an interface to the plugin Vuex module
 */
export default class PluginStoreService {
  constructor(
    private store: Store<RootState>,
    private appEventBus: {
      emit: (event: AppEvent, ...args: any) => void;
      on: (event: AppEvent, listener: (...args: any) => void) => void;
      off: (event: AppEvent, listener: (...args: any) => void) => void;
    }
  ) {}

  getTheme(): ThemeChangedNotification["args"] {
    const cssProps = [
      "--theme-bg",
      "--theme-base",
      "--theme-primary",
      "--theme-secondary",

      "--text-dark",
      "--text",
      "--text-light",
      "--text-lighter",
      "--text-hint",
      "--text-disabled",

      "--brand-info",
      "--brand-success",
      "--brand-warning",
      "--brand-danger",
      "--brand-default",
      "--brand-purple",
      "--brand-pink",

      "--border-color",
      "--link-color",
      "--placeholder",
      "--selection",
      "--input-highlight",

      "--query-editor-bg",

      // BksTextEditor
      "--bks-text-editor-activeline-bg-color",
      "--bks-text-editor-activeline-gutter-bg-color",
      "--bks-text-editor-atom-fg-color",
      "--bks-text-editor-bg-color",
      "--bks-text-editor-bracket-fg-color",
      "--bks-text-editor-builtin-fg-color",
      "--bks-text-editor-comment-attribute-fg-color",
      "--bks-text-editor-comment-def-fg-color",
      "--bks-text-editor-comment-fg-color",
      "--bks-text-editor-comment-tag-fg-color",
      "--bks-text-editor-comment-type-fg-color",
      "--bks-text-editor-cursor-bg-color",
      "--bks-text-editor-fatcursor-bg-color",
      "--bks-text-editor-def-fg-color",
      "--bks-text-editor-error-bg-color",
      "--bks-text-editor-error-fg-color",
      "--bks-text-editor-fg-color",
      "--bks-text-editor-focused-outline-color",
      "--bks-text-editor-foldgutter-fg-color",
      "--bks-text-editor-foldgutter-fg-color-hover",
      "--bks-text-editor-gutter-bg-color",
      "--bks-text-editor-gutter-border-color",
      "--bks-text-editor-guttermarker-fg-color",
      "--bks-text-editor-guttermarker-subtle-fg-color",
      "--bks-text-editor-header-fg-color",
      "--bks-text-editor-highlight-bg-color",
      "--bks-text-editor-keyword-fg-color",
      "--bks-text-editor-linenumber-fg-color",
      "--bks-text-editor-link-fg-color",
      "--bks-text-editor-matchingbracket-fg-color",
      "--bks-text-editor-matchingbracket-bg-color",
      "--bks-text-editor-number-fg-color",
      "--bks-text-editor-property-fg-color",
      "--bks-text-editor-selected-bg-color",
      "--bks-text-editor-matchingselection-bg-color",
      "--bks-text-editor-string-fg-color",
      "--bks-text-editor-tag-fg-color",
      "--bks-text-editor-variable-2-fg-color",
      "--bks-text-editor-variable-3-fg-color",
      "--bks-text-editor-variable-fg-color",
      "--bks-text-editor-namespace-fg-color",
      "--bks-text-editor-type-fg-color",
      "--bks-text-editor-class-fg-color",
      "--bks-text-editor-enum-fg-color",
      "--bks-text-editor-interface-fg-color",
      "--bks-text-editor-struct-fg-color",
      "--bks-text-editor-typeParameter-fg-color",
      "--bks-text-editor-parameter-fg-color",
      "--bks-text-editor-enumMember-fg-color",
      "--bks-text-editor-decorator-fg-color",
      "--bks-text-editor-event-fg-color",
      "--bks-text-editor-function-fg-color",
      "--bks-text-editor-method-fg-color",
      "--bks-text-editor-macro-fg-color",
      "--bks-text-editor-label-fg-color",
      "--bks-text-editor-regexp-fg-color",
      "--bks-text-editor-operator-fg-color",
      "--bks-text-editor-definition-fg-color",
      "--bks-text-editor-variableName-fg-color",
      "--bks-text-editor-bool-fg-color",
      "--bks-text-editor-null-fg-color",
      "--bks-text-editor-className-fg-color",
      "--bks-text-editor-propertyName-fg-color",
      "--bks-text-editor-punctuation-fg-color",
      "--bks-text-editor-meta-fg-color",
      "--bks-text-editor-typeName-fg-color",
      "--bks-text-editor-labelName-fg-color",
      "--bks-text-editor-attributeName-fg-color",
      "--bks-text-editor-attributeValue-fg-color",
      "--bks-text-editor-heading-fg-color",
      "--bks-text-editor-url-fg-color",
      "--bks-text-editor-processingInstruction-fg-color",
      "--bks-text-editor-special-string-fg-color",
      "--bks-text-editor-name-fg-color",
      "--bks-text-editor-deleted-fg-color",
      "--bks-text-editor-character-fg-color",
      "--bks-text-editor-color-fg-color",
      "--bks-text-editor-standard-fg-color",
      "--bks-text-editor-separator-fg-color",
      "--bks-text-editor-changed-fg-color",
      "--bks-text-editor-annotation-fg-color",
      "--bks-text-editor-modifier-fg-color",
      "--bks-text-editor-self-fg-color",
      "--bks-text-editor-operatorKeyword-fg-color",
      "--bks-text-editor-escape-fg-color",
      "--bks-text-editor-strong-fg-color",
      "--bks-text-editor-emphasis-fg-color",
      "--bks-text-editor-strikethrough-fg-color",
      "--bks-text-editor-sql-alias-fg-color",
      "--bks-text-editor-sql-field-fg-color",

      // BksTextEditor context menu
      "--bks-text-editor-context-menu-bg-color",
      "--bks-text-editor-context-menu-fg-color",
      "--bks-text-editor-context-menu-item-bg-color-active",
      "--bks-text-editor-context-menu-item-fg-color-active",
      "--bks-text-editor-context-menu-item-bg-color-hover",
    ];

    const styles = getComputedStyle(document.body);
    /** Key = css property, value = css value */
    const palette: Record<string, string> = {};

    for (const name of cssProps) {
      const camelKey = _.camelCase(name);
      palette[camelKey] = styles.getPropertyValue(name).trim();
    }

    const cssString = cssProps
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

  addTabTypeConfig(params: {
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

  removeTabTypeConfig(identifier: TabTypeConfig.PluginRef): void {
    this.store.commit("tabs/removeTabTypeConfig", identifier);
  }

  getTables(): GetTablesResponse {
    return this.store.state.tables.map((t) => ({
      name: t.name,
      schema: t.schema,
    }));
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
  ): Promise<GetColumnsResponse['result']> {
    const table = this.findTableOrThrow(tableName, schema);

    if (!table.columns || table.columns.length === 0) {
      await this.store.dispatch("updateTableColumns", table);
    }

    return this.findTable(tableName, schema).columns.map((c) => ({
      name: c.columnName,
      type: c.dataType,
    }));
  }

  getConnectionInfo(): GetConnectionInfoResponse {
    return {
      connectionType: this.store.state.connectionType,
      databaseName: this.store.state.database,
      defaultSchema: this.store.state.defaultSchema,
      readOnlyMode: this.store.state.usedConfig.readOnlyMode,
    };
  }

  getActiveTab(): GetActiveTabResponse {
    const activeTab: TransportOpenTab = this.store.state.tabs.active;

    if (!activeTab) {
      return null;
    }

    return this.serializeTab(activeTab);
  }

  getAllTabs(): GetAllTabsResponse {
    return this.store.state.tabs.tabs.map((tab) => this.serializeTab(tab));
  }

  private serializeTab(tab: TransportOpenTab): TabResponse {
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
  async runQuery(query: string): Promise<RunQueryResponse> {
    const results = await this.store.state.connection.executeQuery(query);

    return {
      results: results.map(this.serializeQueryResponse),
    };
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
}
