import IWorkspacePluginStorageItem from "@/common/interfaces/IWorkspacePluginStorageItem";
import { PluginSnapshot } from "@/services/plugin";
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
    preventPoll(_state, _getters, _rootState, rootGetters) {
      // Don't poll if there are no plugins
      if (rootGetters["plugins/enabledPlugins"].length === 0) {
        return true;
      }
      return false;
    },
    listParams(_state, _getters, _rootState, rootGetters) {
      const plugins: PluginSnapshot[] = rootGetters["plugins/enabledPlugins"];
      return {
        pluginId: plugins.map((plugin) => plugin.manifest.id),
        connectionId: rootGetters["connection/connectionId"],
      };
    },
  },
  actions: actionsFor<IWorkspacePluginStorageItem>("workspacePluginStorage", {}),
};
