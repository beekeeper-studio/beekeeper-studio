import {
  DropPosition,
  Folder,
  FolderNode,
  Item,
  ItemNode,
  Node,
} from "./types";

export function zoneAt(node: Node, event: DragEvent): DropPosition {
  // Folders have no position, so they can only be dropped into.
  if (node.type === "folder") {
    return "inside";
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const offset = (event.clientY - rect.top) / rect.height;
  return offset < 0.5 ? "before" : "after";
}

export function buildFolderNodes(folders: Folder[]): FolderNode[] {
  const nodes: FolderNode[] = folders.map((folder) => ({
    id: `folder-${folder.id}`,
    parentId: folder.parentId,
    type: "folder",
    ref: folder,
    children: [],
  }));

  const byId = new Map<number, FolderNode>();
  for (const node of nodes) {
    byId.set(node.ref.id, node);
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
    id: `item-${item.id}`,
    parentId: item[parentIdKey] ?? null,
    type: "item",
    position: item.position ?? 0,
    ref: item,
  }));
}

function descendantsOf(node: FolderNode): Set<number> {
  const result = new Set<number>();
  for (const child of node.children) {
    result.add(child.ref.id);
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
    map.set(node.ref.id, descendantsOf(node));
  }
  return map;
}
