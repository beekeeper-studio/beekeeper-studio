import { Module } from "vuex";
import { State as RootState } from "@/store";
import { ThemeEntriesModule } from "./ThemeEntriesModule";
import { ThemeSnapshotsModule } from "./ThemeSnapshotsModule";

export type State = {
  systemDark: boolean;
};

export const ThemesModule: Module<State, RootState> = {
  namespaced: true,
  modules: {
    entries: ThemeEntriesModule,
    snapshots: ThemeSnapshotsModule,
  },
  state: () => ({
    systemDark: true,
  }),
  mutations: {
    setSystemDark(state, systemDark: boolean) {
      state.systemDark = systemDark;
    },
  },
  actions: {
    async initialize(context) {
      await Promise.all([
        context.dispatch("entries/load"),
        context.dispatch("snapshots/load"),
      ]);
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
    id(_state, getters, _rootState, rootGetters) {
      const id = rootGetters["settings/settings"].themeId?.value || "default";
      const theme = getters["snapshots/snapshotsById"][id];
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
