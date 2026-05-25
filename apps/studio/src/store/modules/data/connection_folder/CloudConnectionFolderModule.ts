import Vue from "vue";
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { SmartLocalStorage } from "@/common/LocalStorage";
import { createTreeItems } from "./treeItems";

const EXPANDED_STORAGE_KEY = "connectionFolderExpanded-v1";

type State = DataState<IConnectionFolder> & {
  expandedState: Record<number, boolean>;
};

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    expandedState: SmartLocalStorage.getJSON(EXPANDED_STORAGE_KEY, {}),
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc'}),
    setFolderExpanded(state, { folderId, expanded }: { folderId: number; expanded: boolean }) {
      Vue.set(state.expandedState, folderId, expanded)
      SmartLocalStorage.addItem(EXPANDED_STORAGE_KEY, state.expandedState)
    },
  },
  getters: {
    treeItems: (state) => (connections: any[]) =>
      createTreeItems(state.items, connections, state.expandedState),
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { connection, folder }) {
      const updated = { ...connection, connectionFolderId: folder?.id ?? null }
      await context.dispatch('data/connections/save', updated, { root: true })
    }
  })
}
