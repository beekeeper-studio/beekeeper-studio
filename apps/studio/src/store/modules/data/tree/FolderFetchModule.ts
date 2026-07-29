import { Module } from "vuex";
import { State as RootState } from "@/store";

type State = {
  /** Folders whose children have already been fetched. */
  fetchedIds: number[];
  /** Folders whose children are being fetched right now. */
  fetchingIds: number[];
};

/**
 * Which folders this module has already fetched the children of
 **/
export const FolderFetchModule: Module<State, RootState> = {
  namespaced: true,
  state() {
    return {
      fetchedIds: [],
      fetchingIds: [],
    };
  },
  mutations: {
    fetchedIds(state, ids: number[]) {
      state.fetchedIds = ids;
    },
    fetchingIds(state, ids: number[]) {
      state.fetchingIds = ids;
    },
    reset(state) {
      state.fetchedIds = [];
      state.fetchingIds = [];
    },
  },
};
