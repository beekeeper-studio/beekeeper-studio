import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginSnapshot } from "@/services/plugin";
import Vue from "vue";

export interface PluginSnapshotsState {
  all: PluginSnapshot[];
}

export const PluginSnapshotsModule: Module<PluginSnapshotsState, RootState> = {
  namespaced: true,
  state: {
    all: [],
  },
  getters: {
    byId(state): Record<string, PluginSnapshot> {
      const obj = {};
      for (const snapshot of state.all) {
        obj[snapshot.manifest.id] = snapshot;
      }
      return obj;
    },
  },
  mutations: {
    set(state, snapshots: PluginSnapshot[]) {
      state.all = snapshots;
    },
  },
  actions: {
    async load(context) {
      const snapshots = await Vue.prototype.$util.send("plugin/plugins");
      context.commit("set", snapshots);
    },
    find(context, pluginId: string): PluginSnapshot | undefined {
      return context.getters.byId[pluginId];
    },
};
