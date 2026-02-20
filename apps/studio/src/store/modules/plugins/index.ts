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
  actions: {
    async initialize(context) {
      await Promise.all([
        context.dispatch("entries/load"),
        context.dispatch("snapshots/load"),
      ]);
    },
  },
};
