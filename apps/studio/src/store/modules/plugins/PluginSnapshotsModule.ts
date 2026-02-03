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
  },
};
