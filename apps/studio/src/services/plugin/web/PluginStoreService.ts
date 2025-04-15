import type { Store } from "vuex";
import { State as RootState } from "@/store";
import { SidebarTab } from "@/store/modules/PluginModule";
import { QueryTab, TabType } from "@/store/models";
import { TransportOpenTab } from "@/common/transport/TransportOpenTab";

/**
 * Service that provides a clean interface to the plugin Vuex module
 */
export default class PluginStoreService {
  constructor(private store: Store<RootState>) {}

  addSidebarTab(tab: SidebarTab): void {
    this.store.dispatch("plugins/addSidebarTab", tab);
  }
  removeSidebarTab(id: string): void {
    this.store.dispatch("plugins/removeSidebarTab", id);
  }
  getSidebarTabs(): SidebarTab[] {
    return this.store.state.plugins.sidebarTabs;
  }

  getTables(): string[] {
    return this.store.state.tables.map((t) => t.name);
  }

  async getColumns(
    tableName: string
  ): Promise<{ name: string; type: string }[]> {
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

  getConnectionInfo() {
    return {
      connectionType: this.store.state.connectionType,
      defaultDatabase: this.store.state.usedConfig.defaultDatabase,
      readOnlyMode: this.store.state.usedConfig.readOnlyMode,
    };
  }

  getActiveTab() {
    const activeTab: TransportOpenTab = this.store.state.tabs.active;

    if (!activeTab) {
      return null;
    }

    const data: Record<string, any> = {};

    if (activeTab.tabType === TabType.query) {
      const queryTab = activeTab;
      data.id = queryTab.id;
      data.text = queryTab.unsavedQueryText;
      data.title = queryTab.title;
    }

    return {
      type: activeTab.tabType,
      data,
    };
  }

  /**
   * Update the query text in a tab by ID
   * @param tabId ID of the tab to update
   * @param query The SQL query text to set
   * @throws Error if tab not found or not a query tab
   */
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
}
