import { DragNode, Folder, FolderNode, Item, ItemNode } from "./types";

export function nodeKey(node: DragNode): string {
  return `${node.type}-${node.ref.id}`;
}

export function buildFolderNodes(folders: Folder[]): FolderNode[] {
  const nodes: FolderNode[] = folders.map((folder) => ({
    id: folder.id,
    parentId: folder.parentId,
    type: "folder",
    ref: folder,
    children: [],
  }));

  const byId = new Map<number, FolderNode>();
  for (const node of nodes) {
    byId.set(node.id, node);
  }

  for (const node of nodes) {
    const parentId = node.parentId;
    if (parentId == null) {
      continue;
    }
    const parent = byId.get(parentId);
    if (parent && parent !== node) {
      parent.children.push(node);
    }
  }

  return nodes;
}

export function buildItemNodes(items: Item[], parentIdKey: string): ItemNode[] {
  return items.map((item) => ({
    id: item.id,
    parentId: item[parentIdKey] ?? null,
    type: "item",
    position: item.position ?? 0,
    ref: item,
  }));
}

function descendantsOf(node: FolderNode): Set<number> {
  const result = new Set<number>();
  for (const child of node.children) {
    result.add(child.id);
    for (const id of descendantsOf(child)) {
      result.add(id);
    }
  }
  return result;
}

/** Every folder id mapped to the ids of all its descendants, deep. */
export function buildDescendantsMap(
  nodes: FolderNode[]
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const node of nodes) {
    map.set(node.id, descendantsOf(node));
  }
  return map;
}
