export type Folderable = {
  id: number | null;
  name: string;
  parentId: number | null;
};

type Ref = {
  ref: Folderable;
  refType: "folder";
} | {
  ref: unknown;
  refType: "item";
};

export type Node = Ref & {
  id: number;
  parentId: number | null;
  nodes?: Node[];
};

export type Tree = {
  nodes: Node[];
  /** The parents of these nodes are GONE.. */
  orphanedNodes: Node[];
};

export type DropPosition = "before" | "after" | "inside";

export type DropTarget = {
  key: string;
  position: DropPosition;
};

export type TreeNodeMoveEvent = {
  source: Node;
  target: Node;
  position: DropPosition;
  /** Folder id the source ends up under. null = tree root. */
  parentId: number | null;
};

export type TreeFolderContextmenuEvent = {
  event: MouseEvent;
  node: Node;
};

/** Folders and items have separate id spaces, so the refType is part of the key. */
export function nodeKey(node: Node): string {
  return `${node.refType}-${node.id}`;
}

export interface TreeEventMap extends HTMLElementEventMap {
  "bks-tree-node-move": CustomEvent<TreeNodeMoveEvent>;
  "bks-tree-folder-contextmenu": CustomEvent<TreeFolderContextmenuEvent>;
}
