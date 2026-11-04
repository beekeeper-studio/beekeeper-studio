import { DropPosition, FolderNode, Node } from "./types";

export function zoneAt(
  source: Node | null,
  target: Node,
  event: DragEvent
): DropPosition {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const offset = (event.clientY - rect.top) / rect.height;

  if (target.type !== "folder") {
    return offset < 0.5 ? "before" : "after";
  }

  // Only a folder can land beside a folder. An item has nowhere to sit between
  // two folders, so it always goes in.
  if (source?.type !== "folder") {
    return "inside";
  }

  // The outer quarters land beside the folder, the middle half lands in it.
  if (offset < 0.25) {
    return "before";
  }
  if (offset > 0.75) {
    return "after";
  }
  return "inside";
}

/**
 * The folder a node lands in. Dropping beside a node means joining whatever
 * holds it, which is how a nested folder is reachable without dragging all the
 * way back to its parent's row.
 */
export function destinationOf(
  target: Node,
  position: DropPosition
): FolderNode["id"] | null {
  if (target.type === "folder" && position === "inside") {
    return target.id;
  }
  return target.parentId;
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
