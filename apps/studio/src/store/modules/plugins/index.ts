import { Module } from "vuex";
import { State as RootState } from "@/store";
import {
  PluginEntriesModule,
  PluginEntriesState,
} from "@/store/modules/plugins/PluginEntriesModule";
import {
  PluginSnapshotsModule,
  PluginSnapshotsState,
} from "@/store/modules/plugins/PluginSnapshotsModule";
import { PluginOrigin } from "@/services/plugin";
import globals from "@/common/globals";

export type PluginsState = {
  snapshots: PluginSnapshotsState;
  entries: PluginEntriesState;
};

export const PluginsModule: Module<{}, RootState> = {
  namespaced: true,
  modules: {
    entries: PluginEntriesModule,
    snapshots: PluginSnapshotsModule,
  },
  getters: {
    findPluginOrigin(_state, _getters, rootState): (id: string) => PluginOrigin {
      const entries: Record<string, PluginOrigin> = {};
      for (const entry of rootState.plugins.entries.communityEntries) {
        entries[entry.id] = "community";
      }
      for (const entry of rootState.plugins.entries.officialEntries) {
        entries[entry.id] = "official";
      }
      for (const bundledPlugin of globals.plugins.ensureInstalled) {
        entries[bundledPlugin.id] = "official";
      }
      return (id: string) => {
        return entries[id] || "unlisted";
      }
    },
  },
  actions: {
    async initialize(context) {
      await Promise.all([
        context.dispatch("entries/load"),
        context.dispatch("snapshots/load"),
      ]);
    },
  },
};
