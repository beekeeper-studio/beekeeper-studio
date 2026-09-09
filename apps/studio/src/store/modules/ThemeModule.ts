import { Module } from "vuex";
import { State as RootState } from "../index";

const darkMediaQuery =
  typeof window === "undefined" || typeof window.matchMedia !== "function"
    ? null
    : window.matchMedia("(prefers-color-scheme: dark)");

export type Theme = {
  value: string;
  label: string;
};

export type State = {
  systemDark: boolean;
  themes: Theme[];
};

export const ThemeModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    systemDark: darkMediaQuery?.matches ?? false,
    themes: [
      { value: "default", label: "Beekeeper Studio" },
      { value: "solarized", label: "Solarized" },
    ],
  }),
  mutations: {
    setSystemDark(state, systemDark: boolean) {
      state.systemDark = systemDark;
    },
  },
  actions: {
    initialize(context) {
      darkMediaQuery?.addEventListener("change", (event) => {
        context.commit("setSystemDark", event.matches);
      });
      context.commit("setSystemDark", darkMediaQuery?.matches ?? false);
    },
  },
  getters: {
    name(_state, _getters, _rootState, rootGetters) {
      return rootGetters["settings/settings"].themeName?.value || "default";
    },
    type(state, _getters, _rootState, rootGetters) {
      const value = rootGetters["settings/settings"].themeDark?.value;
      const dark = value === "auto" ? state.systemDark : value === "true";
      return dark ? "dark" : "light";
    },
  },
};
