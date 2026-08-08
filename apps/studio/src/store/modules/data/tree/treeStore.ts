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
 * store.dispatch("data/connections/ensureLoaded", [1, 2])
 * ```
 **/

import { ActionTree, Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import { HasId } from "@/common/interfaces/IGeneric";
import { ClientError } from "@/store/modules/data/StoreHelpers";

export type FolderFetchState = {
  /** Folders whose children have already been fetched. */
  fetchedIds: number[];
  /** Folders whose children are being fetched right now. */
  fetchingIds: number[];
};

/**
 * Which folders this module has already fetched the children of
 **/
export const FolderFetchModule: Module<FolderFetchState, RootState> = {
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
      if (parentIds.length === 0) {
        return;
      }

      await context.dispatch("loadMore", {
        params: { [paramsKey]: parentIds },
      });
      context.commit("folders/fetchedIds", parentIds);
    },
    /** Pulls the whole tree in one request, for callers that need every folder
     * up front rather than the expanded ones. */
    async ensureAllLoaded(context) {
      await context.dispatch("load");
      context.commit(
        "folders/fetchedIds",
        context.state.items.map((item) => item.id)
      );
    },
    async ensureLoaded(context, parentIds: number[]) {
      const { fetchedIds, fetchingIds } = context.state.folders;
      const unfetchedIds = _.difference(parentIds, fetchedIds, fetchingIds);
      if (unfetchedIds.length === 0) {
        return;
      }

      context.commit("folders/fetchingIds", [...fetchingIds, ...unfetchedIds]);

      let fetched: boolean;
      try {
        await context.dispatch("loadMore", {
          params: { [paramsKey]: unfetchedIds },
        });
        fetched = !context.state.error;
      } catch {
        fetched = false;
      } finally {
        context.commit(
          "folders/fetchingIds",
          _.difference(context.state.folders.fetchingIds, unfetchedIds)
        );
      }

      if (fetched) {
        context.commit("folders/fetchedIds", [
          ...context.state.folders.fetchedIds,
          ...unfetchedIds,
        ]);
      }
    },
  };
}
