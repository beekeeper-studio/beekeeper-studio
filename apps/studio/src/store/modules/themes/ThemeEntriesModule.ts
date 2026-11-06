import { Module } from "vuex";
import { State as RootState } from "@/store";
import { ExtensionRegistryEntry, RegistryMap } from "@/services/plugin/types";
import Vue from "vue";
import rawLog from "@bksLogger";

const log = rawLog.scope("ThemeEntriesModule");

export interface ThemeEntriesState {
  entries: RegistryMap;
  loading: boolean;
  error: string | null;
}

export const ThemeEntriesModule: Module<ThemeEntriesState, RootState> = {
  namespaced: true,
  state: {
    entries: {} as RegistryMap,
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
    all(state): ExtensionRegistryEntry[] {
      return Object.values(state.entries).flat();
    },
  },
  actions: {
    async load(context) {
      context.commit("setLoading", true);
      context.commit("setError", null);
      try {
        const { entries, errors } = await Vue.prototype.$util.send(
          "theme/entries",
          { clearCache: true }
        );
        context.commit("setEntries", entries);
        context.commit("setError", errors.length > 0 ? errors.join("; ") : null);
      } catch (e) {
        log.error(e);
        context.commit("setError", e.message ?? String(e));
      }
      context.commit("setLoading", false);
    },
  },
};
