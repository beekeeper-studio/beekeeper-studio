import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from "../index";
import { SmartLocalStorage } from "@/common/LocalStorage";
import Vue from "vue";

export interface SidebarTab {
  id: string;
  label: string;
  /** By passing url, the tab will load an iframe */
  url?: string;
}

interface State {
  tabs: SidebarTab[];
  primarySidebarSize: number;
  primarySidebarOpen: boolean;
  secondarySidebarSize: number;
  secondarySidebarOpen: boolean;
  secondaryActiveTabId?: string;
  globalSidebarActiveItem: "tables" | "history" | "queries";
  hasAdminPrivileges: boolean;
}

const PRIMARY_SIDEBAR_OPEN_KEY = 'primarySidebarOpen-v2'
const PRIMARY_SIDEBAR_SIZE_KEY = 'primarySidebarOpenSize-v2'
const SECONDARY_SIDEBAR_OPEN_KEY = 'secondarySidebarOpen-v2'
const SECONDARY_SIDEBAR_SIZE_KEY = 'secondarySidebarCurrentSize-v2'

const PRIMARY_SIDEBAR_INITIAL_SIZE = 35 // in percent
const SECONDARY_SIDEBAR_INITIAL_SIZE = 30 // in percent

export const SidebarModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    tabs: [
      {
        id: "json-viewer",
        label: "JSON Viewer",
      },
    ],
    hasAdminPrivileges: false,

    // PRIMARY SIDEBAR
    primarySidebarOpen: SmartLocalStorage.getBool(PRIMARY_SIDEBAR_OPEN_KEY, true),
    primarySidebarSize: SmartLocalStorage.getJSON(PRIMARY_SIDEBAR_SIZE_KEY, PRIMARY_SIDEBAR_INITIAL_SIZE),

    // SECONDARY SIDEBAR
    secondarySidebarOpen: SmartLocalStorage.getBool(SECONDARY_SIDEBAR_OPEN_KEY, false),
    secondarySidebarSize: SmartLocalStorage.getJSON(SECONDARY_SIDEBAR_SIZE_KEY, SECONDARY_SIDEBAR_INITIAL_SIZE),
    secondaryActiveTabId: "json-viewer",

    globalSidebarActiveItem: "tables",
  }),
  getters: {
  },
  mutations: {
    setHasAdminPrivileges(state, hasAdminPrivileges: boolean) {
      state.hasAdminPrivileges = hasAdminPrivileges;
    },
    // PRIMARY SIDEBAR
    primarySidebarOpen(state, value: boolean) {
      state.primarySidebarOpen = value
    },
    primarySidebarSize(state, size: number) {
      state.primarySidebarSize = size
    },
    globalSidebarActiveItem(state, item: "tables" | "history" | "queries") {
      state.globalSidebarActiveItem = item
    },

    // SECONDARY SIDEBAR
    secondarySidebarOpen(state, value: boolean) {
      state.secondarySidebarOpen = value
    },
    secondarySidebarSize(state, size: number) {
      state.secondarySidebarSize = size
    },
    secondaryActiveTabId(state, tabId: string) {
      state.secondaryActiveTabId = tabId;
    },
    addSecondarySidebar(state, tab: SidebarTab) {
      state.tabs.push(tab)
    },
    removeSecondarySidebar(state, tabId: string) {
      state.tabs = state.tabs.filter((t) => t.id !== tabId)
    },
  },
  actions: {
    async setHasAdminPrivileges(context) {
      const result = await Vue.prototype.$util.send('conn/hasAdminPermission', {});
      context.commit('setHasAdminPrivileges', result);
    },
    // PRIMARY SIDEBAR
    setPrimarySidebarOpen(context, open: boolean) {
      SmartLocalStorage.setBool(PRIMARY_SIDEBAR_OPEN_KEY, open)
      context.commit('primarySidebarOpen', open)
    },
    setPrimarySidebarSize(context, size: number) {
      SmartLocalStorage.addItem(PRIMARY_SIDEBAR_SIZE_KEY, size)
      context.commit('primarySidebarSize', size)
    },

    // SECONDARY SIDEBAR
    setSecondarySidebarOpen(context, open: boolean) {
      SmartLocalStorage.setBool(SECONDARY_SIDEBAR_OPEN_KEY, open)
      context.commit('secondarySidebarOpen', open)
    },
    setSecondarySidebarSize(context, size: number) {
      SmartLocalStorage.addItem(SECONDARY_SIDEBAR_SIZE_KEY, size)
      context.commit('secondarySidebarSize', size)
    },
    setSecondaryActiveTabId(context, tabId: string) {
      if (!context.state.tabs.find((t) => t.id === tabId)) {
        throw new Error(`Tab ${tabId} does not exist`);
      }
      context.commit("secondaryActiveTabId", tabId);
    },

    setGlobalSidebarActiveItem(context, item: "tables" | "history" | "queries") {
      context.commit("globalSidebarActiveItem", item);
    },
  },
};
