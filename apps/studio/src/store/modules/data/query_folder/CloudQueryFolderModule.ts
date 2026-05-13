import Vue from "vue";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { SmartLocalStorage } from "@/common/LocalStorage";
import { createTreeItems } from "./treeItems";

const EXPANDED_STORAGE_KEY = "queryFolderExpanded-v1";

type State = DataState<IQueryFolder> & {
  expandedState: Record<number, boolean>;
};

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    expandedState: SmartLocalStorage.getJSON(EXPANDED_STORAGE_KEY, {}),
  },
  mutations: {
    ...mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc'}),
    setFolderExpanded(state, { folderId, expanded }: { folderId: number; expanded: boolean }) {
      Vue.set(state.expandedState, folderId, expanded)
      SmartLocalStorage.addItem(EXPANDED_STORAGE_KEY, state.expandedState)
    },
  },
  getters: {
    treeItems: (state) => (queries: ISavedQuery[]) =>
      createTreeItems(state.items, queries, state.expandedState),
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { query, folder }) {
      const updated = { ...query, queryFolderId: folder?.id ?? null }
      await context.dispatch('data/queries/save', updated, { root: true })
    }
  })
}
