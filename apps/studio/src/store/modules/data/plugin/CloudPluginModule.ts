import IWorkspacePluginStorageItem from "@/common/interfaces/IWorkspacePluginStorageItem";
import {
  actionsFor,
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<IWorkspacePluginStorageItem>;

export const WorkspacePluginModule: DataStore<
  IWorkspacePluginStorageItem,
  State
> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IWorkspacePluginStorageItem>(
    {},
    { field: "pluginId", direction: "asc" }
  ),
  getters: {
    // Don't poll if we're not connected or if we have no active plugins
    preventPoll(_state, _getters, rootState, rootGetters) {
      if (!rootState.connected) {
        return true;
      }
      if (rootGetters["plugins/activePlugins"].length === 0) {
        return true;
      }
      return false;
    },
    listParams(_state, _getters, _rootState, rootGetters) {
      const activePlugins: string[] = rootGetters["plugins/activePlugins"];
      return {
        pluginId: activePlugins,
        connectionId: rootGetters["connection/connectionId"],
      };
    },
  },
  actions: actionsFor<IWorkspacePluginStorageItem>("workspacePluginStorage", {}),
};
