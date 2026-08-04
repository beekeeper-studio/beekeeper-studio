import { DropPosition, FolderNode, ItemNode, Node } from "./types";

export function zoneAt(node: Node, event: DragEvent): DropPosition {
  // Folders have no position, so they can only be dropped into.
  if (node.type === "folder") {
    return "inside";
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const offset = (event.clientY - rect.top) / rect.height;
  return offset < 0.5 ? "before" : "after";
}

function descendantsOf(node: FolderNode): Set<FolderNode["id"]> {
  const result = new Set<FolderNode["id"]>();
  for (const child of node.children) {
    result.add(child.id);
    for (const id of descendantsOf(child)) {
      result.add(id);
    }
  }
  return result;
}

/** Every folder mapped to the ids of all its descendants, deep. */
export function buildDescendantsMap(
  nodes: FolderNode[]
): Map<FolderNode["id"], Set<FolderNode["id"]>> {
  const map = new Map<FolderNode["id"], Set<FolderNode["id"]>>();
  for (const node of nodes) {
    map.set(node.id, descendantsOf(node));
  }
  return map;
}

/**
 * Collect item node ids in the same order the Tree renders them (expanded
 * folders only; subfolders before sibling items within a folder).
 */
export function collectVisibleItemIds(
  folderNodes: FolderNode[],
  itemNodes: ItemNode[],
  expandedIds: FolderNode["id"][]
): ItemNode["id"][] {
  const result: ItemNode["id"][] = [];

  const childItems = (folderId: FolderNode["id"] | null) =>
    itemNodes
      .filter((item) => item.parentId === folderId)
      .sort((a, b) => a.position - b.position);

  const walkFolder = (folder: FolderNode) => {
    if (!expandedIds.includes(folder.id)) {
      return;
    }
    for (const child of folder.children) {
      walkFolder(child);
    }
    for (const item of childItems(folder.id)) {
      result.push(item.id);
    }
  };

  const rootFolders = folderNodes.filter((node) => node.parentId === null);
  for (const folder of rootFolders) {
    walkFolder(folder);
  }
  for (const item of childItems(null)) {
    result.push(item.id);
  }

  return result;
}

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
