import { Module } from "vuex";
import { State as RootState } from "@/store";
import { Keybinding } from "@/services/plugin";
import Vue from "vue";

interface State {
  /** `placement` as a key for fast lookup.*/
  map: Partial<Record<Keybinding["placement"], Keybinding[]>>;
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
     * Keybindings are resolved by menu `placement`.
     *
     * ```ini
     * [keybindings.plugins.bks-ai-shell]
     * new-tab-dropdown-item = ctrlOrCmd+l
     * ```
     *
     * ```js
     * {
     *   "id": "bks-ai-shell",
     *   "capabilities": {
     *     "menu": [{
     *       "command": "new-tab-dropdown-item",
     *       "placement": "newTabDropdown" // <-- This is the key
     *     }],
     *   }
     * }
     * ```
     *
     * Usage:
     *
     * ```ts
     * // Use $vHotkeyKeymap
     * $vHotkeyKeymap({ ...getKeybindings("newTabDropdown") });
     * // or $CMKeymap
     * $CMKeymap({ ...getKeybindings("newTabDropdown") });
     * ```
     */
    getKeybindings(state) {
      return (placement: string): Record<string, Function> => {
        if (!state.map[placement]) {
          return {};
        }
        const keybindings: Record<string, Function> = {};
        for (const keybinding of state.map[placement]) {
          keybindings[keybinding.path] = keybinding.handler;
        }
        return keybindings;
      };
    },
  },
  mutations: {
    add(state, keybinding: Keybinding) {
      if (!state.map[keybinding.placement]) {
        Vue.set(state.map, keybinding.placement, []);
      }
      state.map[keybinding.placement].push(keybinding);
    },
    remove(state, keybinding: Omit<Keybinding, "path">) {
      if (!state.map[keybinding.placement]) {
        return;
      }
      const handlerIdx = state.map[keybinding.placement].findIndex(
        (k) => k.handler === keybinding.handler
      );
      if (handlerIdx !== -1) {
        state.map[keybinding.placement].splice(handlerIdx, 1);
      }
    },
  },
};
