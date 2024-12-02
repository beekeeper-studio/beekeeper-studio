import { getKeybindingsFromVimrc, IMapping } from "@/lib/editor/vim";
import config from "@/config";
import { State as RootState } from "../index";
import rawLog from "electron-log";

const log = rawLog.scope("TextEditorModule");

interface State {
  vimKeymaps: IMapping[];
}

import { Module } from "vuex";

export const TextEditorModule: Module<State, RootState> = {
  state: {
    vimKeymaps: [],
  },
  getters: {
    userKeymap(_state, _getters, rootState) {
      const settings = rootState["settings"]?.settings;
      const value = settings?.keymap?.value;
      return value &&
        config.defaults.keymapTypes.map((k) => k.value).includes(value)
        ? value
        : "default";
    },
  },
  actions: {
    async init(context) {
      log.info("Initializing TextEditorModule");
      const keybindings = await getKeybindingsFromVimrc();
      context.commit("vimKeymaps", keybindings);
    },
  },
};
