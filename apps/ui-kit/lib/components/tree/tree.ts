import { DropPosition, FolderNode, Node } from "./types";

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
