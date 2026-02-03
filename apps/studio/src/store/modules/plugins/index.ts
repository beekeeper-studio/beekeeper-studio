import { Module } from "vuex";
import { State as RootState } from "../index";
import { PluginSnapshot } from "@/services/plugin";

interface State {
  pluginSnapshots: PluginSnapshot[];
}

export const PluginsModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pluginSnapshots: [],
  }),
  getters: {
    enabledPlugins(state) {
      return state.pluginSnapshots.filter((plugin) => !plugin.disabled);
    },
  },
  mutations: {
    addPluginSnapshot(state, plugin: PluginSnapshot) {
      state.pluginSnapshots.push(plugin);
    },
  },
};
