import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from "../index";
import { SmartLocalStorage } from "@/common/LocalStorage";

export interface SidebarTab {
  id: string;
  label: string;
  /** By passing url, the tab will load an iframe */
  url?: string;
}

interface State {
  tabs: SidebarTab[];
  /** in pixels */
  primarySidebarWidth: number;
  primarySidebarOpen: boolean;
  /** in pixels */
  secondarySidebarWidth: number;
  secondarySidebarOpen: boolean;
  secondaryActiveTabId?: string;
  globalSidebarActiveItem: "tables" | "history" | "queries";
}

const PRIMARY_SIDEBAR_OPEN_KEY = 'primarySidebarOpen-v2'
const PRIMARY_SIDEBAR_WIDTH_KEY = "primarySidebarWidth-v3"
const SECONDARY_SIDEBAR_OPEN_KEY = 'secondarySidebarOpen-v2'
const SECONDARY_SIDEBAR_WIDTH_KEY = "secondarySidebarWidth-v3"

const PRIMARY_SIDEBAR_INITIAL_WIDTH = 240 // in pixels
const SECONDARY_SIDEBAR_INITIAL_WIDTH = 240 // in pixels

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
    primarySidebarWidth: SmartLocalStorage.getJSON(PRIMARY_SIDEBAR_WIDTH_KEY, PRIMARY_SIDEBAR_INITIAL_WIDTH),

    // SECONDARY SIDEBAR
    secondarySidebarOpen: SmartLocalStorage.getBool(SECONDARY_SIDEBAR_OPEN_KEY, false),
    secondarySidebarWidth: SmartLocalStorage.getJSON(SECONDARY_SIDEBAR_WIDTH_KEY, SECONDARY_SIDEBAR_INITIAL_WIDTH),
    secondaryActiveTabId: "json-viewer",

    globalSidebarActiveItem: "tables",
  }),
  getters: {
  },
  mutations: {
    // PRIMARY SIDEBAR
    primarySidebarOpen(state, value: boolean) {
      state.primarySidebarOpen = value
    },
    primarySidebarWidth(state, width: number) {
      state.primarySidebarWidth = width
    },
    globalSidebarActiveItem(state, item: "tables" | "history" | "queries") {
      state.globalSidebarActiveItem = item
    },

    // SECONDARY SIDEBAR
    secondarySidebarOpen(state, value: boolean) {
      state.secondarySidebarOpen = value
    },
    secondarySidebarWidth(state, width: number) {
      state.secondarySidebarWidth = width
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
    // PRIMARY SIDEBAR
    setPrimarySidebarOpen(context, open: boolean) {
      SmartLocalStorage.setBool(PRIMARY_SIDEBAR_OPEN_KEY, open)
      context.commit('primarySidebarOpen', open)
    },
    /** @param width - in pixels */
    setPrimarySidebarWidth(context, width: number) {
      SmartLocalStorage.addItem(PRIMARY_SIDEBAR_WIDTH_KEY, width)
      context.commit("primarySidebarWidth", width)
    },

    // SECONDARY SIDEBAR
    setSecondarySidebarOpen(context, open: boolean) {
      SmartLocalStorage.setBool(SECONDARY_SIDEBAR_OPEN_KEY, open)
      context.commit('secondarySidebarOpen', open)
    },
    /** @param width - in pixels */
    setSecondarySidebarWidth(context, width: number) {
      SmartLocalStorage.addItem(SECONDARY_SIDEBAR_WIDTH_KEY, width)
      context.commit("secondarySidebarWidth", width)
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

    /**
     * Prior to this, we use percentages to determine widths of the sidebars.
     * This function will make sure the percentages are transformed into
     * pixels so upgrading users don't see the sidebars resizing.
     *
     * @param params.containerWidth - in pixels
     */
    readjustWidths(context, params: { containerWidth: number }) {
      const PRIMARY_SIDEBAR_SIZE_KEY = "primarySidebarOpenSize-v2";
      const SECONDARY_SIDEBAR_SIZE_KEY = "secondarySidebarCurrentSize-v2";

      if (SmartLocalStorage.exists(PRIMARY_SIDEBAR_SIZE_KEY)) {
        const size = SmartLocalStorage.getJSON(PRIMARY_SIDEBAR_SIZE_KEY);
        if (_.isNumber(size)) {
          const width = params.containerWidth * (size / 100);
          const clampedWidth = Math.max(
            width,
            window.bksConfig.ui.layout.primarySidebarMinWidth
          );
          context.dispatch("setPrimarySidebarWidth", clampedWidth);
          SmartLocalStorage.remove(PRIMARY_SIDEBAR_SIZE_KEY);
        }
      }

      if (SmartLocalStorage.exists(SECONDARY_SIDEBAR_SIZE_KEY)) {
        const size = SmartLocalStorage.getJSON(SECONDARY_SIDEBAR_SIZE_KEY);
        if (_.isNumber(size)) {
          const width = params.containerWidth * (size / 100);
          const clampedWidth = Math.max(
            width,
            window.bksConfig.ui.layout.secondarySidebarMinWidth
          );
          context.dispatch("setSecondarySidebarWidth", clampedWidth);
          SmartLocalStorage.remove(SECONDARY_SIDEBAR_SIZE_KEY);
        }
      }
    },
  },
};
