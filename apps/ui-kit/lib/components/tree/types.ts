export type Folderable = {
  id: number | null;
  name: string;
  parentId: number | null;
};

type Ref = {
  ref: Folderable;
  type: "folder";
} | {
  ref: unknown;
  type: "item";
};

export type Node = Ref & {
  id: number;
  parentId: number | null;
  nodes?: Node[];
};

export type FolderNode = Extract<Node, { type: "folder" }>;

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

/** Folders and items have separate id spaces, so the type is part of the key. */
export function nodeKey(node: Node): string {
  return `${node.type}-${node.id}`;
}

export interface TreeEventMap extends HTMLElementEventMap {
  "bks-tree-node-move": CustomEvent<TreeNodeMoveEvent>;
}
