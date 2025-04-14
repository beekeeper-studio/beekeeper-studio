import type { Store } from 'vuex';
import { SidebarTab } from '@/store/modules/PluginModule';

/**
 * Service that provides a clean interface to the plugin Vuex module
 */
export default class PluginStoreService {
  constructor(private store: Store<unknown>) {}

  addSidebarTab(tab: SidebarTab): void {
    this.store.dispatch('plugins/addSidebarTab', tab);
  }
  removeSidebarTab(id: string): void {
    this.store.dispatch('plugins/removeSidebarTab', id);
  }
  getSidebarTabs(): SidebarTab[] {
    return this.store.state.plugins.sidebarTabs;
  }
}
