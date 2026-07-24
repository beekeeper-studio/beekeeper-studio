import type { FolderNode, ItemNode } from "@beekeeperstudio/ui-kit";
import { HasId } from "@/common/interfaces/IGeneric";
import { IFolder } from "@/common/interfaces/IQueryFolder";

export interface FolderNodeWithRef extends FolderNode {
  ref: IFolder;
}

export interface ItemNodeWithRef<T extends HasId = HasId> extends ItemNode {
  ref: T;
}

/**
 * `children` holds references to the same node objects, so a flat array still
 * describes the whole tree.
 */
export function buildTreeFolderNodes(folders: IFolder[]): FolderNodeWithRef[] {
  const nodes: FolderNodeWithRef[] = folders.map((folder) => ({
    id: `folder-${folder.id}` as FolderNode["id"],
    parentId: folder.parentId ? `folder-${folder.parentId}` : null,
    type: "folder",
    name: folder.name,
    ref: folder,
    children: [],
    draggable: true,
  }));

  const byId = new Map<FolderNode["id"], FolderNodeWithRef>();
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

export function buildTreeItemNodes<T extends HasId & { position?: number }>(
  items: T[],
  parentIdKey: string,
  nameKey: string
): ItemNodeWithRef<T>[] {
  return items.map((item) => {
    const parentId = item[parentIdKey];
    return {
      id: `item-${item.id}` as ItemNode["id"],
      parentId: parentId ? `folder-${parentId}` : null,
      type: "item",
      name: item[nameKey] ?? "",
      position: item.position ?? 0,
      ref: item,
      draggable: true,
    };
  });
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
