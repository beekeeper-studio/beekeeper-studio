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
  primarySidebarSize: number;
  primarySidebarOpen: boolean;
  secondarySidebarSize: number;
  secondarySidebarOpen: boolean;
  secondaryActiveTabId?: string;
}

const PRIMARY_SIDEBAR_OPEN_KEY = 'primarySidebarOpen'
const PRIMARY_SIDEBAR_SIZE_KEY = 'primarySidebarOpenSize'
const SECONDARY_SIDEBAR_OPEN_KEY = 'secondarySidebarOpen'
const SECONDARY_SIDEBAR_SIZE_KEY = 'secondarySidebarCurrentSize'

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

    // PRIMARY SIDEBAR
    primarySidebarOpen: SmartLocalStorage.getBool(PRIMARY_SIDEBAR_OPEN_KEY, true),
    primarySidebarSize: SmartLocalStorage.getJSON(PRIMARY_SIDEBAR_SIZE_KEY, PRIMARY_SIDEBAR_INITIAL_SIZE),

    // SECONDARY SIDEBAR
    secondarySidebarOpen: SmartLocalStorage.getBool(SECONDARY_SIDEBAR_OPEN_KEY, false),
    secondarySidebarSize: SmartLocalStorage.getJSON(SECONDARY_SIDEBAR_SIZE_KEY, SECONDARY_SIDEBAR_INITIAL_SIZE),
    secondaryActiveTabId: "json-viewer",
  }),
  getters: {
  },
  mutations: {
    // PRIMARY SIDEBAR
    primarySidebarOpen(state, value: boolean) {
      state.primarySidebarOpen = value
    },
    primarySidebarSize(state, size: number) {
      state.primarySidebarSize = size
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
  },
  actions: {
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
  },
};
