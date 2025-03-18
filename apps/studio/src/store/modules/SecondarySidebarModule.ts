import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from "../index";
import { SmartLocalStorage } from "@/common/LocalStorage";

interface SidebarTab {
  id: string;
  label: string;
}

interface State {
  tabs: SidebarTab[];
  activeTabId?: string;
  open: boolean;
}

export const SecondarySidebarModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    tabs: [
      {
        id: "json-viewer",
        label: "JSON Viewer",
      },
    ],
    activeTabId: "json-viewer",
    open: SmartLocalStorage.getBool('openSecondarySidebar', false),
  }),
  getters: {
  },
  mutations: {
    activeTabId(state, tabId: string) {
      state.activeTabId = tabId;
    },
    open(state, value: boolean) {
      state.open = value
    },
  },
  actions: {
    toggleOpen(context, forceOpen?: boolean) {
      if (typeof forceOpen === "undefined") {
        forceOpen = !context.state.open;
      }
      SmartLocalStorage.setBool('openSecondarySidebar', forceOpen)
      context.commit('open', forceOpen)
    },
    setActiveTab(context, tabId: string) {
      if (!context.state.tabs.find((t) => t.id === tabId)) {
        throw new Error(`Tab ${tabId} does not exist`);
      }
      context.commit("activeTabId", tabId);
    },
  },
};
