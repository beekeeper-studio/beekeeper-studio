import { Module } from "vuex";
import { State as RootState } from "../index";

export type Theme = {
  id: string;
  label: string;
};

export type State = {
  systemDark: boolean;
  themes: Theme[];
};

export const ThemeModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    systemDark: true,
    themes: [
      { id: "default", label: "Beekeeper Studio" },
      { id: "solarized", label: "Solarized" },
      { id: "dracula", label: "Dracula / Alucard" },
      { id: "github", label: "GitHub" },
    ],
  }),
  mutations: {
    setSystemDark(state, systemDark: boolean) {
      state.systemDark = systemDark;
    },
  },
  actions: {
    setId(context, value: string) {
      context.dispatch(
        "settings/save",
        { key: "themeId", value },
        { root: true }
      );
    },
    setDark(context, value: string) {
      context.dispatch(
        "settings/save",
        { key: "appearance", value },
        { root: true }
      );
    },
  },
  getters: {
    id(_state, _getters, _rootState, rootGetters) {
      return rootGetters["settings/settings"].themeId?.value || "default";
    },
    appearance(_state, _getters, _rootState, rootGetters) {
      return rootGetters["settings/settings"].appearance?.value || "auto";
    },
    dark(state, getters) {
      if (getters.appearance === "auto") {
        return state.systemDark;
      }
      return getters.appearance === "dark";
    },
  },
};
