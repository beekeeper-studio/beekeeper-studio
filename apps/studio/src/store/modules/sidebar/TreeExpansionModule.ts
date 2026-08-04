import { Module } from "vuex";
import { State as RootState } from "@/store";

export type TreeExpansionState = {
  /** Folders the sidebar tree is showing expanded. */
  expandedIds: number[];
};

type State = TreeExpansionState;

/**
 * Which folders a sidebar tree has expanded. This is view state, not data, so
 * it outlives the workspace switches that replace the data modules.
 *
 * `state` is a factory so the same module can back more than one tree.
 **/
export const TreeExpansionModule: Module<State, RootState> = {
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
