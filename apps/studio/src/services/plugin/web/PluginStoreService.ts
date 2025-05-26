import type { Store } from "vuex";
import { State as RootState } from "@/store";
import { SidebarTab } from "../PluginModule";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";
import {
  CreateQueryTabResponse,
  GetActiveTabResponse,
  GetAllTabsResponse,
  GetColumnsResponse,
  GetConnectionInfoResponse,
  GetTablesResponse,
  GetThemeResponse,
  RunQueryResponse,
  RunQueryTabResponse,
  TabResponse,
} from "../comm";
import { findTable } from "@/common/transport/TransportOpenTab";
import { AppEvent } from "@/common/AppEvent";
import { TabType } from "@/store/models";
import { NgQueryResult } from "@/lib/db/models";
import _ from "lodash";

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

  getTheme(): GetThemeResponse {
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
      "--bks-text-editor-def-fg-color",
      "--bks-text-editor-error-bg-color",
      "--bks-text-editor-error-fg-color",
      "--bks-text-editor-fg-color",
      "--bks-text-editor-gutter-bg-color",
      "--bks-text-editor-guttermarker-fg-color",
      "--bks-text-editor-guttermarker-subtle-fg-color",
      "--bks-text-editor-header-fg-color",
      "--bks-text-editor-keyword-fg-color",
      "--bks-text-editor-linenumber-fg-color",
      "--bks-text-editor-link-fg-color",
      "--bks-text-editor-matchingbracket-fg-color",
      "--bks-text-editor-matchingbracket-bg-color",
      "--bks-text-editor-number-fg-color",
      "--bks-text-editor-property-fg-color",
      "--bks-text-editor-selected-bg-color",
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
    this.store.dispatch("plugins/addSidebarTab", tab);
  }
  removeSidebarTab(id: string): void {
    this.store.dispatch("plugins/removeSidebarTab", id);
  }
  getSidebarTabs(): SidebarTab[] {
    return this.store.state.plugins.sidebarTabs;
  }

  getTables(): GetTablesResponse {
    return this.store.state.tables.map((t) => t.name);
  }

  async getColumns(tableName: string): Promise<GetColumnsResponse> {
    let table = this.store.state.tables.find((t) => t.name === tableName);

    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    if (!table.columns) {
      await this.store.dispatch("updateTableColumns", table);
    }

    table = this.store.state.tables.find((t) => t.name === tableName);

    return table.columns.map((c) => ({
      name: c.columnName,
      type: c.dataType,
    }));
  }

  getConnectionInfo(): GetConnectionInfoResponse {
    return {
      connectionType: this.store.state.connectionType,
      defaultDatabase: this.store.state.usedConfig.defaultDatabase,
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

  async createQueryTab(
    query: string,
    title: string
  ): Promise<CreateQueryTabResponse> {
    const tab = {
      tabType: "query",
      title,
      unsavedChanges: false,
      unsavedQueryText: query,
    } as TransportOpenTab;

    const { id }: { id: number } = await this.store.dispatch("tabs/add", {
      item: tab,
      endOfPosition: true,
    });
    await this.store.dispatch("tabs/setActive", tab);

    return { id };
  }

  updateQueryText(tabId: number, query: string): void {
    const tab = this.store.state.tabs.tabs.find(
      (t: TransportOpenTab) => t.id === tabId
    );

    if (!tab) {
      throw new Error(`Tab with ID ${tabId} not found`);
    }

    if (tab.tabType !== TabType.query) {
      throw new Error(`Tab with ID ${tabId} is not a query tab`);
    }

    // Update the unsaved query text in the tab
    tab.unsavedQueryText = query;
  }

  private serializeQueryResponse(result: NgQueryResult) {
    return {
      fields: result.fields.map((field) => ({
        id: field.id,
        name: field.name,
        dataType: field.dataType,
      })),
      rows: result.rows,
    };
  }

  /* Run query in the background */
  async runQuery(query: string): Promise<RunQueryResponse> {
    const results = await this.store.state.connection.executeQuery(query);

    return {
      results: results.map(this.serializeQueryResponse),
    };
  }
}
