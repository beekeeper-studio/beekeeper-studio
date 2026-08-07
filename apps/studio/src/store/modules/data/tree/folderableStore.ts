/**
 * What a folder module needs beyond `treeStore`: loading the default folders,
 * and making a draft folder.
 *
 * Requires `mutationsFor`, `actionsFor` (or `utilActionsFor`), and `treeStore`.
 *
 * @example
 * ```ts
 * export const CloudConnectionFolderModule = {
 *   mutations: {
 *     ...mutationsFor<IConnectionFolder>({}),
 *     ...folderableMutations<IConnectionFolder>(),
 *   },
 *   actions: {
 *     ...actionsFor<IConnectionFolder>("connectionFolders", {}),
 *     ...treeActions<IConnectionFolder>("parentIds", "parentId"),
 *     ...folderableActions<IConnectionFolder>(),
 *   },
 * }
 *
 * store.dispatch("data/connectionFolders/startDrafting", parentId)
 * ```
 **/

import { ActionTree, MutationTree } from "vuex";
import { State as RootState } from "@/store";
import { ClientError } from "@/store/modules/data/StoreHelpers";
import { IFolder } from "@/common/interfaces/IQueryFolder";

/** State of a folder module using {@link folderableActions}. */
export type FolderableState<T> = {
  loading: boolean;
  error: ClientError;
  items: T[];
  /** The folder being created right now, or null when nothing is being named. */
  draft: T | null;
};

export function folderableActions<T extends IFolder>(): ActionTree<
  FolderableState<T>,
  RootState
> {
  return {
    async refresh(context, parentIds: number[]) {
      await context.dispatch("resetTree");
      await context.dispatch("loadDefaultFolders");
      await context.dispatch("loadByParentIds", parentIds);
    },
    async loadDefaultFolders(context) {
      await context.dispatch("load", { params: { default: true } });

      const personalIdx = context.state.items.findIndex(
        (f) => f.default && f.personal
      );

      if (personalIdx === -1) {
        return;
      }

      // Make sure the personal folder is first
      const sorted = [
        context.state.items[personalIdx],
        ...context.state.items.toSpliced(personalIdx, 1),
      ];
      await context.dispatch("mutate", { type: "set", data: sorted });
    },
    async startDrafting(context, parentId?: number) {
      if (context.state.draft) {
        await context.dispatch("stopDrafting");
      }
      // A draft has no id until it is saved, so it doesn't satisfy IFolder yet.
      // @ts-expect-error
      const draft: IFolder = {
        id: null,
        parentId,
        name: "Untitled folder",
      };
      context.commit("draft", draft);
      await context.dispatch("mutate", { type: "upsert", data: draft });
    },
    async stopDrafting(context) {
      if (!context.state.draft) {
        return;
      }
      await context.dispatch("mutate", {
        type: "remove",
        data: context.state.draft,
      });
      context.commit("draft", null);
    },
  };
}

export function folderableMutations<T extends IFolder>(): MutationTree<
  FolderableState<T>
> {
  return {
    draft(state, draft: T | null) {
      state.draft = draft;
    },
  };
}
