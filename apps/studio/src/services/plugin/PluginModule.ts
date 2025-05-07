/**
 * A vuex module used for managing plugins inside the application.
 */

import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from "../index";

export interface SidebarTab {
  id: string;
  name: string;
  location: "secondary";
  /** The path to the entry html file of the sidebar. This is relative to the plugin's root directory. */
  entry: string;
}

interface State {
  sidebarTabs: SidebarTab[];
}

export const PluginModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    sidebarTabs: [],
  }),
  getters: {
  },
  mutations: {
    addSidebarTab(state, value: SidebarTab) {
      state.sidebarTabs.push(value);
    },
    removeSidebarTab(state, id: string) {
      state.sidebarTabs = state.sidebarTabs.filter((t) => t.id !== id);
    },
  },
  actions: {
    addSidebarTab(context, value: SidebarTab) {
      context.commit("addSidebarTab", value);
    },
    removeSidebarTab(context, id: string) {
      context.commit("removeSidebarTab", id);
    },
  },
};
