import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginSnapshotsModule } from "./PluginSnapshotsModule";
import { PluginEntriesModule } from "./PluginEntriesModule";

export const PluginsModule: Module<{}, RootState> = {
  namespaced: true,
  modules: {
    snapshots: PluginSnapshotsModule,
    entries: PluginEntriesModule,
  },
};
