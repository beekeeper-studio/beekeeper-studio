import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginEntriesModule } from "@/store/modules/plugins/PluginEntriesModule";

export const PluginsModule: Module<{}, RootState> = {
  namespaced: true,
  modules: {
    entries: PluginEntriesModule,
  },
  actions: {
    async initialize(context) {
      await context.dispatch("entries/load");
    },
  },
};
