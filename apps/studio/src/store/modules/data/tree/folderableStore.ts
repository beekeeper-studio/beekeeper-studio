/**
 * What a folder module needs beyond `treeStore`: loading the default folders.
 *
 * Requires `mutationsFor`, `actionsFor` (or `utilActionsFor`), and `treeStore`.
 *
 * @example
 * ```ts
 * export const CloudConnectionFolderModule = {
 *   actions: {
 *     ...actionsFor<IConnectionFolder>("connectionFolders", {}),
 *     ...treeActions<IConnectionFolder>({ plural: "parentIds", singular: "parentId" }),
 *     ...folderableActions<IConnectionFolder>(),
 *   },
 * }
 * ```
 **/

import { ActionTree } from "vuex";
import { State as RootState } from "@/store";
import { ClientError } from "@/store/modules/data/StoreHelpers";
import { IFolder } from "@/common/interfaces/IQueryFolder";

/** State of a folder module using {@link folderableActions}. */
export type FolderableState<T> = {
  loading: boolean;
  error: ClientError;
  items: T[];
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
  };
}
