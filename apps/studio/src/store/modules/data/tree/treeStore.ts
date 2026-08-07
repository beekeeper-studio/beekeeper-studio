/**
 * Fetches only the children of folders the user has expanded, instead of the
 * whole tree.
 *
 * Requires `mutationsFor`, `actionsFor` (or `utilActionsFor`), and
 * `FolderFetchModule` under `folders`.
 *
 * @example
 * ```ts
 * export const CloudConnectionModule = {
 *   modules: {
 *     folders: FolderFetchModule,
 *   },
 *   mutations: {
 *     ...mutationsFor<ICloudSavedConnection>({}),
 *   },
 *   actions: {
 *     ...actionsFor<ICloudSavedConnection>("connections", {}),
 *     ...treeActions<ICloudSavedConnection>("connectionFolderIds"),
 *   },
 * }
 *
 * store.dispatch("data/connections/loadByParentIds", [1, 2])
 * ```
 **/

import { ActionTree, Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import { HasId } from "@/common/interfaces/IGeneric";
import { ClientError } from "@/store/modules/data/StoreHelpers";

export type FolderFetchState = {
  /** Folders whose children are being fetched right now. */
  fetchingIds: number[];
};

/**
 * Which folders this module is fetching the children of
 **/
export const FolderFetchModule: Module<FolderFetchState, RootState> = {
  namespaced: true,
  state() {
    return {
      fetchingIds: [],
    };
  },
  mutations: {
    fetchingIds(state, ids: number[]) {
      state.fetchingIds = ids;
    },
    reset(state) {
      state.fetchingIds = [];
    },
  },
};

export type TreeState<T> = {
  error: ClientError;
  items: T[];
  folders: FolderFetchState;
};

/**
 * Actions for models that support tree structure or nested folders.
 **/
export function treeActions<T extends HasId>(
  paramsKey: "connectionFolderIds" | "queryFolderIds" | "parentIds"
): ActionTree<TreeState<T>, RootState> {
  return {
    async refresh(context, parentIds: number[]) {
      await context.dispatch("resetTree");
      await context.dispatch("loadByParentIds", parentIds);
    },
    async resetTree(context) {
      await context.dispatch("mutate", { type: "set", data: [] });
      context.commit("folders/reset");
    },
    async loadByParentIds(context, parentIds: number[]) {
      parentIds = _.difference(parentIds, context.state.folders.fetchingIds);

      if (parentIds.length === 0) {
        return;
      }

      context.commit("folders/fetchingIds", [
        ...context.state.folders.fetchingIds,
        ...parentIds,
      ]);

      try {
        await context.dispatch("load", { scope: { [paramsKey]: parentIds } });
      } finally {
        context.commit(
          "folders/fetchingIds",
          _.difference(context.state.folders.fetchingIds, parentIds)
        );
      }
    },
  };
}
