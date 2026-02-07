import { Module } from "vuex";
import { State as RootState } from "@/store";
import { KeybindingsModule } from "./KeybindingsModule";

interface State {
}

export const PluginsModule: Module<State, RootState> = {
  namespaced: true,
  modules: {
    keybindings: KeybindingsModule,
  },
};
