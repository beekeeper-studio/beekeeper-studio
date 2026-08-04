import { ActionTree, Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import { ClientError } from "@/store/modules/data/StoreHelpers";
import { HasId } from "@/common/interfaces/IGeneric";

type FolderFetchState = {
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

/** State of a data module hosting a {@link FolderFetchModule} under `folders`. */
type OwnerState<T extends HasId> = {
  loading: boolean;
  error: ClientError;
  folders: FolderFetchState;
  items: T[];
};

/**
 * Actions for the folder models themselves. Use in pairs with `treeActions`.
 *
 * @example
 * ```ts
 *  const vuexModule = {
 *    actions: {
 *      ...treeActions("connectionFolderIds"),
 *      ...folderableActions(),
 *    },
 *  }
 * ```
 **/
export function folderableActions<T extends HasId>(): ActionTree<
  OwnerState<T>,
  RootState
> {
  return {
    async refresh(context, parentIds: number[]) {
      await context.dispatch("resetTree");
      await context.dispatch("loadDefaultFolders");
      await context.dispatch("loadByParentIds", parentIds);
    },
    async loadDefaultFolders(context) {
      await context.dispatch("loadMore", { params: { default: true } });
    },
  };
}

/**
 * Actions for models that support tree structure or nested folders.
 **/
export function treeActions<T extends HasId>(
  paramsKey: "connectionFolderIds" | "queryFolderIds" | "parentIds"
): ActionTree<OwnerState<T>, RootState> {
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
