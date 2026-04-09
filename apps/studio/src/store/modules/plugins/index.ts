import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginEntriesModule } from "@/store/modules/plugins/PluginEntriesModule";
import { KeybindingsModule } from "./KeybindingsModule";

export const PluginsModule: Module<{}, RootState> = {
  namespaced: true,
  modules: {
    entries: PluginEntriesModule,
    keybindings: KeybindingsModule,
  },
  actions: {
    async initialize(context) {
      await context.dispatch("entries/load");
    },
  },
};
