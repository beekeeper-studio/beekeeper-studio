import { ActionTree } from "vuex";
import { State as RootState } from "@/store";
import { HasId } from "@/common/interfaces/IGeneric";
import { IFolder } from "@/common/interfaces/IQueryFolder";

export type MovePosition = "before" | "after" | "inside";

/**
 * `targetId` is the destination folder when dropping inside one, and the
 * sibling to land next to otherwise.
 */
export type MovePayload = {
  sourceId: number;
  targetId: number | null;
  position: MovePosition;
};

type ItemState = { items: (HasId & Record<string, unknown>)[] };

type FolderState = { items: IFolder[] };

export function itemMoveActions(
  parentIdKey: string
): ActionTree<ItemState, RootState> {
  return {
    async move(context, { sourceId, targetId, position }: MovePayload) {
      const item = context.state.items.find((i) => i.id === sourceId);
      if (!item) {
        return;
      }

      if (position === "inside") {
        return await context.dispatch("reorder", {
          item,
          [parentIdKey]: targetId,
          position: { before: null },
        });
      }

      const target = context.state.items.find((i) => i.id === targetId);
      if (!target) {
        return;
      }

      let slot: { before: number } | { after: number };
      if (position === "after") {
        slot = { after: target.id };
      } else {
        slot = { before: target.id };
      }

      return await context.dispatch("reorder", {
        item,
        [parentIdKey]: target[parentIdKey] ?? null,
        position: slot,
      });
    },
  };
}

export function folderMoveActions(): ActionTree<FolderState, RootState> {
  return {
    async move(context, { sourceId, targetId, position }: MovePayload) {
      const folder = context.state.items.find((f) => f.id === sourceId);
      if (!folder) {
        return;
      }

      let parentId = targetId;
      if (position !== "inside") {
        const target = context.state.items.find((f) => f.id === targetId);
        parentId = target?.parentId ?? null;
      }

      // A folder can't live inside itself or where it already is.
      if (parentId === sourceId || parentId === (folder.parentId ?? null)) {
        return;
      }

      return await context.dispatch("save", { ...folder, parentId });
    },
  };
}
