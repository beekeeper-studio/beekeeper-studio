import { Module } from "vuex";
import { State as RootState } from "../index";
import { PluginView } from "@/services/plugin";

interface State {
  /** All views that are active. */
  views: {
    pluginId: string;
    // TODO (Azmi): add more info here when needed
  }[];
}

export const PluginModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    views: [],
  }),
  getters: {
    activePlugins(context) {
      return context.views.map((view) => view.pluginId);
    },
  },
  mutations: {
    addView(state, pluginId: string) {
      state.views.push({ pluginId });
    },
    removeView(state, pluginId: string) {
      const viewIdx = state.views.findIndex(
        (view) => view.pluginId === pluginId
      );
      if (viewIdx !== -1) {
        state.views.splice(viewIdx, 1);
      }
    },
  },
};
