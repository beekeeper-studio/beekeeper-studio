import Vue from "vue";
import { Module } from "vuex";
import { State as RootState } from "../index";
import { ThemeSnapshot } from "@/services/plugin/types";

export type State = {
  systemDark: boolean;
  themes: ThemeSnapshot[];
};

export const ThemeModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    systemDark: true,
    themes: [],
  }),
  mutations: {
    setSystemDark(state, systemDark: boolean) {
      state.systemDark = systemDark;
    },
    setThemes(state, themes: ThemeSnapshot[]) {
      state.themes = themes;
    },
  },
  actions: {
    async loadThemes(context) {
      const themes = await Vue.prototype.$util.send("theme/themes");
      context.commit("setThemes", themes);
    },
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
    themes(state): ThemeSnapshot[] {
      return state.themes;
    },
    id(state, _getters, _rootState, rootGetters) {
      const id = rootGetters["settings/settings"].themeId?.value || "default";
      const theme = state.themes.find((t) => t.manifest.id === id);
      if (theme?.disableState.disabled) {
        return "default";
      }
      return id;
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
