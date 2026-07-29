import { Module } from "vuex";
import { State as RootState } from "@/store";

type State = {
  /** Folders the sidebar tree is showing expanded. */
  expandedIds: number[];
};

/**
 * Tree state that belongs to the sidebar, not to the data itself
 **/
export const SidebarModule: Module<State, RootState> = {
  namespaced: true,
  state() {
    return {
      expandedIds: [],
    };
  },
  mutations: {
    expandedIds(state, ids: number[]) {
      state.expandedIds = ids;
    },
  },
};
