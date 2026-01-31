import IPluginData from "@/common/interfaces/IPluginData";
import { PluginSnapshot } from "@/services/plugin";
import {
  actionsFor,
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";

type State = DataState<IPluginData>;

export const CloudPluginDatumModule: DataStore<
  IPluginData,
  State
> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IPluginData>(
    {},
    { field: "pluginId", direction: "asc" }
  ),
  actions: actionsFor<IPluginData, State>(
    "pluginData",
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
