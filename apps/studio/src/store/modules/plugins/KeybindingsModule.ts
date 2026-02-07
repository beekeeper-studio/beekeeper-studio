import { Module } from "vuex";
import { State as RootState } from "@/store";
import { Keybinding } from "@/services/plugin";
import Vue from "vue";

interface State {
  /** `alias` as a key for fast lookup.*/
  map: Partial<Record<Keybinding["alias"], Keybinding[]>>;
}

export const KeybindingsModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    map: {},
  }),
  getters: {
    /**
     * @example
     *
     * Keybindings are resolved by menu `placement` (alias).
     *
     * ```ini
     * [keybindings.plugins.bks-ai-shell]
     * new-tab-dropdown-item = ctrlOrCmd+l
     * ```
     *
     * ```json
     * {
     *   "id": "bks-ai-shell",
     *   "capabilities": {
     *     "menu": [{
     *       "command": "new-tab-dropdown-item",
     *       "placement": "newTabDropdown"
     *     }],
     *   }
     * }
     * ```
     *
     * Usage:
     * ```ts
     * // Use $vHotkeyKeymap or $CMKeymap
     * $vHotkeyKeymap({
     *   "queryEditor.switchPaneFocus": this.switchPaneFocus,
     *   ...getKeybindingsByAlias("newTabDropdown"),
     * })
     * ```
     */
    getKeybindingsByAlias(state) {
      return (alias: string): Record<string, Function> => {
        if (!state.map[alias]) {
          return {};
        }
        const keybindings: Record<string, Function> = {};
        for (const keybinding of state.map[alias]) {
          keybindings[keybinding.path] = keybinding.handler;
        }
        return keybindings;
      };
    },
  },
  mutations: {
    add(state, keybinding: Keybinding) {
      if (!state.map[keybinding.alias]) {
        Vue.set(state.map, keybinding.alias, []);
      }
      state.map[keybinding.alias].push(keybinding);
    },
    remove(state, keybinding: Omit<Keybinding, "path">) {
      if (!state.map[keybinding.alias]) {
        return;
      }
      const handlerIdx = state.map[keybinding.alias].findIndex(
        (k) => k.handler === keybinding.handler
      );
      if (handlerIdx !== -1) {
        state.map[keybinding.alias].splice(handlerIdx, 1);
      }
    },
  },
};
