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
  actions: actionsFor<IWorkspacePluginStorageItem, State>(
    "workspacePluginStorage",
    {},
    {
      preventPoll(context) {
        // Don't poll if there are no plugins
        if (context.rootGetters["plugins/enabledPlugins"].length === 0) {
          return true;
        }
        return false;
      },
      listParams(context) {
        const plugins: PluginSnapshot[] =
          context.rootGetters["plugins/enabledPlugins"];
        return {
          pluginId: plugins.map((plugin) => plugin.manifest.id),
          connectionId: context.rootGetters["connection/connectionId"],
        };
      },
    }
  ),
};
