import { Module } from "vuex";
import { State as RootState } from "@/store";
import { RegistryMap } from "@/services/plugin";
import Vue from "vue";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginEntriesModule");

export interface PluginEntriesState {
  entries: RegistryMap;
  loading: boolean;
  error: string | null;
}

export const PluginEntriesModule: Module<PluginEntriesState, RootState> = {
  namespaced: true,
  state: {
    entries: null,
    loading: false,
    error: null,
  },
  mutations: {
    setEntries(state, entries: RegistryMap) {
      state.entries = entries;
    },
    setLoading(state, loading: boolean) {
      state.loading = loading;
    },
    setError(state, error: string | null) {
      state.error = error;
    },
  },
  getters: {
    all(state) {
      return Object.keys(state.entries).reduce((prev, curr) => {
        return [...prev, ...state.entries[curr]];
      }, []);
    },
  },
  actions: {
    async load(context) {
      context.commit("setLoading", true);
      context.commit("setError", null);
      try {
        const entries = await Vue.prototype.$util.send(
          "plugin/entries",
          { clearCache: true }
        );
        context.commit("setEntries", entries);
      } catch (e) {
        log.error(e);
        context.commit("setError", e.message ?? String(e));
      }
      context.commit("setLoading", false);
    },
  },
};
