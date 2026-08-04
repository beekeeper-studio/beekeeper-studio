import type {
  FolderNode,
  ItemNode,
  TreeNodeMoveEvent,
} from "@beekeeperstudio/ui-kit";
import { collectVisibleItemIds } from "@beekeeperstudio/ui-kit/tree";

export { collectVisibleItemIds };

export function toggleSelectedId(
  selectedIds: ItemNode["id"][],
  id: ItemNode["id"]
): ItemNode["id"][] {
  const index = selectedIds.indexOf(id);
  if (index === -1) {
    return [...selectedIds, id];
  }
  return selectedIds.toSpliced(index, 1);
}

export function rangeSelectVisibleIds(
  selectedIds: ItemNode["id"][],
  anchorId: ItemNode["id"],
  targetId: ItemNode["id"],
  visibleIds: ItemNode["id"][]
): ItemNode["id"][] {
  const anchorIndex = visibleIds.indexOf(anchorId);
  const targetIndex = visibleIds.indexOf(targetId);
  if (anchorIndex < 0 || targetIndex < 0) {
    return selectedIds;
  }
  const [start, end] =
    anchorIndex < targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];
  const next = [...selectedIds];
  for (const id of visibleIds.slice(start, end + 1)) {
    if (!next.includes(id)) {
      next.push(id);
    }
  }
  return next;
}
import { HasId } from "@/common/interfaces/IGeneric";
import { IFolder } from "@/common/interfaces/IQueryFolder";

export interface ExtendedFolderNode extends FolderNode {
  ref: IFolder;
}

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

export function buildItemNodes<T extends HasId & { position?: number }>(
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
      position: item.position ?? 0,
      ref: item,
      draggable: true,
    };
  });
}

/**
 * Collect item refs in the same order the ui-kit Tree renders them (expanded
 * folders only; subfolders before sibling items within a folder).
 */
export function collectVisibleItemRefs<T extends HasId>(
  folderNodes: ExtendedFolderNode[],
  itemNodes: ExtendedItemNode<T>[],
  expandedIds: FolderNode["id"][]
): T[] {
  const visibleIds = collectVisibleItemIds(folderNodes, itemNodes, expandedIds);
  const byId = new Map(itemNodes.map((node) => [node.id, node.ref]));
  return visibleIds
    .map((id) => byId.get(id))
    .filter((ref): ref is T => ref !== undefined);
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

export function getSelfAndAnscestors(
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

  /** Anscestors are excluded from this list. */
  const filteredList = list.toSpliced(index, 1);

  return getSelfAndAnscestors(self.parentId, filteredList, returnList);
}

export function getDescendants(
  root: number | Map<number, IFolder[]>,
  list: IFolder[]
): IFolder[] {
  if (typeof root === "number") {
    root = new Map([[root, []]]);
  }

  /** Descendants are excluded from this list. */
  const filteredList: IFolder[] = [];
  let foundDescendant = false;

  for (const item of list) {
    if (root.has(item.parentId)) {
      root.get(item.parentId).push(item);
      if (!root.has(item.id)) {
        root.set(item.id, []);
      }
      foundDescendant = true;
    } else {
      filteredList.push(item);
    }
  }

  /** End when we don't find a descendant. */
  if (!foundDescendant) {
    return [...root.values()].flat();
  }

  return getDescendants(root, filteredList);
}
