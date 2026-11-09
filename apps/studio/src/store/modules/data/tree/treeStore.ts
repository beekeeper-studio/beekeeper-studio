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
 *     ...treeActions<ICloudSavedConnection>({ plural: "connectionFolderIds", singular: "connectionFolderId" }),
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

interface LoadOptions {
  parentIds: number[],
  persistentIds: number[]
}

/**
 * Actions for models that support tree structure or nested folders.
 **/
export function treeActions<T extends HasId>(
  parentKeys: {
    plural: "connectionFolderIds" | "queryFolderIds" | "parentIds",
    singular: "connectionFolderId" | "queryFolderId" | "parentId"
  },
  local: boolean = false,
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
      return await context.dispatch('loadWithOptions', {
        parentIds,
        extraIds: []
      });
    },
    async loadWithOptions(context, options: LoadOptions) {
      let parentIds = options.parentIds;
      const persistentIds = options.persistentIds ?? [];
      parentIds = _.difference(parentIds, context.state.folders.fetchingIds);

      if (parentIds.length === 0 && !local) {
        return { error: null };
      }

      context.commit("folders/fetchingIds", [
        ...context.state.folders.fetchingIds,
        ...parentIds,
      ]);

      let error: ClientError | null = null;

      const params = local ?
        [ { [parentKeys.plural]: parentIds }, { [parentKeys.plural]: []}, { ids: persistentIds } ] :
        { [parentKeys.plural]: parentIds, ids: persistentIds };

      try {
        await context.dispatch("load", {
          params,
          replaceIf(item: T) {
            const itemParentId = item[parentKeys.singular];
            return parentIds.includes(itemParentId) || persistentIds.includes(item.id);
          },
          onError(fetchError: ClientError) {
            error = fetchError;
          },
        });
      } finally {
        context.commit(
          "folders/fetchingIds",
          _.difference(context.state.folders.fetchingIds, parentIds)
        );
      }

      return { error };
    },
    async unloadByParentIds(context, parentIds: number[]) {
      return await context.dispatch('unloadWithOptions', {
        parentIds,
        persistentIds: []
      })
    },
    /** Drops a collapsed folder's children so the next expand refetches them. */
    async unloadWithOptions(context, options: LoadOptions) {
      const parentIds = options.parentIds;
      const persistentIds = options.persistentIds ?? [];
      if (parentIds.length === 0) {
        return;
      }

      const stale = context.state.items.filter((item) =>
        parentIds.includes(item[parentKeys.singular]) && !persistentIds.includes(item.id)
      );

      if (stale.length === 0) {
        return;
      }

      await context.dispatch("mutate", { type: "remove", data: stale });
    },
  };
}
