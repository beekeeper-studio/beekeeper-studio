import type {
  FolderNode,
  ItemNode,
  TreeNodeMoveEvent,
} from "@beekeeperstudio/ui-kit";
import { HasId } from "@/common/interfaces/IGeneric";
import { IFolder } from "@/common/interfaces/IQueryFolder";

export type ExtendedNode = ExtendedFolderNode | ExtendedItemNode;

export type ExtendedFolderNode = FolderNode & { ref: IFolder };

export interface ExtendedItemNode<T extends HasId = HasId> extends ItemNode {
  ref: T;
  /** The key that references the parent folder. Connection and Query use keys
   * like `connectionFolderId` or `queryFolderId` to reference the parent folder. */
  parentIdKey: string;
}

/**
 * `children` holds references to the same node objects, so a flat array still
 * describes the whole tree.
 */
export function buildFolderNodes(folders: IFolder[]): ExtendedFolderNode[] {
  const nodes: ExtendedFolderNode[] = folders.map(buildFolderNode);

  const byId = new Map<FolderNode["id"], ExtendedFolderNode>();
  for (const node of nodes) {
    byId.set(node.id, node);
  }

  for (const node of nodes) {
    if (node.parentId === null) {
      continue;
    }
    const parent = byId.get(node.parentId);
    if (parent && parent !== node) {
      parent.children.push(node);
    }
  }

  return nodes;
}

export function buildFolderNode(folder: IFolder): ExtendedFolderNode {
  return {
    id: `folder-${folder.id}` as FolderNode["id"],
    parentId: folder.parentId ? `folder-${folder.parentId}` : null,
    type: "folder",
    name: folder.name,
    ref: folder,
    children: [],
    draggable: true,
  };
}

export function buildItemNodes<T extends HasId>(
  items: T[],
  parentIdKey: string,
  nameKey: string
): ExtendedItemNode<T>[] {
  return items.map((item) => {
    const parentId = item[parentIdKey];
    return {
      id: `item-${item.id}` as ItemNode["id"],
      parentId: parentId ? `folder-${parentId}` : null,
      parentIdKey,
      type: "item",
      name: item[nameKey] ?? "",
      ref: item,
      draggable: true,
    };
  });
}

/** Transform {@link TreeNodeMoveEvent} into a consumable payload for the reorder action. */
export function parseReorderTarget(event: TreeNodeMoveEvent) {
  const target = event.target as ExtendedItemNode | ExtendedFolderNode;

  if (target.type === "folder") {
    if (event.position !== "inside") {
      throw new Error(
        "Items can only be reordered within their own list, not moved relative to folders."
      );
    }

    return { parentId: target.ref.id, position: { before: null } } as const;
  }

  if (target.type === "item") {
    const parentId: number = target.ref[target.parentIdKey];
    const targetId = target.ref.id;

    if (event.position === "after") {
      return { parentId, position: { after: targetId } } as const;
    }

    return { parentId, position: { before: targetId } } as const;
  }

  throw new Error(`Unknown target type "${target["type"]}"`);
}

export function getSelfAndAncestors(
  selfId: number,
  list: IFolder[],
  returnList: IFolder[] = []
): IFolder[] {
  const index = list.findIndex((item) => item.id === selfId);

  if (index === -1) {
    return returnList;
  }

  const self = list[index];

  returnList.push(self);

  /** Ancestors are excluded from this list. */
  const filteredList = list.toSpliced(index, 1);

  return getSelfAndAncestors(self.parentId, filteredList, returnList);
}
