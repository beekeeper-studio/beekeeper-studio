import IWorkspacePluginStorageItem from "@/common/interfaces/IWorkspacePluginStorageItem";
import {
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

interface State extends DataState<IWorkspacePluginStorageItem> {
  unsupported: boolean;
}

export const LocalWorkspacePluginModule: DataStore<IWorkspacePluginStorageItem, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    unsupported: true,
    pollError: null,
  },
  mutations: mutationsFor<IWorkspacePluginStorageItem>({}),
  actions: {
    async load() {
      // Workspace plugin storage is not supported in local workspace
    },
    async poll() {
      // Workspace plugin storage is not supported in local workspace
    },
    async save(_context, item) {
      return item;
    },
    async remove() {
      // Workspace plugin storage is not supported in local workspace
    },
    async clone(_c, item) {
      return item;
    },
    async reload(_c, _id) {
      return null;
    },
    async clearError() {
      // Workspace plugin storage is not supported in local workspace
    },
  },
};
