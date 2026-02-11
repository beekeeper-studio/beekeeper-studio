import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginRegistryEntry } from "@/services/plugin";
import Vue from "vue";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginEntriesModule");

export interface PluginEntriesState {
  all: PluginRegistryEntry[];
  loading: boolean;
}

export const PluginEntriesModule: Module<PluginEntriesState, RootState> = {
  namespaced: true,
  state: {
    all: [],
    loading: false,
  },
  mutations: {
    set(state, entries: PluginRegistryEntry[]) {
      state.all = entries;
    },
    setLoading(state, loading: boolean) {
      state.loading = loading;
    },
  },
  actions: {
    async load(context) {
      context.commit("setLoading", true);
      try {
        const entries = await Vue.prototype.$util.send("plugin/entries", {
          refresh: true,
        });
        context.commit("set", entries);
      } catch (e) {
        log.error(e);
      }
      context.commit("setLoading", false);
    },
  },
};
