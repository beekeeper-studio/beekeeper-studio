import IPluginData from "@/common/interfaces/IPluginData";
import {
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

interface State extends DataState<IPluginData> {
  unsupported: boolean;
}

export const LocalPluginDatumModule: DataStore<IPluginData, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    unsupported: true,
    pollError: null,
  },
  mutations: mutationsFor<IPluginData>({}),
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
