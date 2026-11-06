import { Module } from "vuex";
import { State as RootState } from "@/store";
import { ThemeSnapshot } from "@/services/plugin/types";
import Vue from "vue";

export interface ThemeSnapshotsState {
  all: ThemeSnapshot[];
}

export const ThemeSnapshotsModule: Module<ThemeSnapshotsState, RootState> = {
  namespaced: true,
  state: {
    all: [],
  },
  getters: {
    snapshotsById(state): Record<string, ThemeSnapshot> {
      const obj = {};
      for (const snapshot of state.all) {
        obj[snapshot.manifest.id] = snapshot;
      }
      return obj;
    },
  },
  mutations: {
    set(state, snapshots: ThemeSnapshot[]) {
      state.all = snapshots;
    },
  },
  actions: {
    async load(context) {
      const snapshots = await Vue.prototype.$util.send("theme/themes");
      context.commit("set", snapshots);
    },
  },
};
