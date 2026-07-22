export type Folder = {
  id: number;
  name: string;
  parentId: number | null;
};

export type Item = {
  id: number;
  position?: number;
  [parentIdKey: string]: number | null | undefined;
};

/**
 * A folder in the tree. `children` holds references to its subfolder nodes, so
 * a flat array of these still describes the whole tree.
 */
export type FolderNode = {
  id: `folder-${number}`;
  parentId: number | null;
  type: "folder";
  ref: Folder;
  children: FolderNode[];
};

export type ItemNode = {
  id: `item-${number}`;
  parentId: number | null;
  type: "item";
  ref: Item;
  position: number;
};

export type Node = FolderNode | ItemNode;

export type DropPosition = "before" | "after" | "inside";

export type DropTarget = {
  id: Node["id"];
  position: DropPosition;
};

/**
 * Where the source lands among its new siblings, relative to an item id.
 * `{ before: null }` means the first slot.
 */
export type DropSlot = { before: number | null } | { after: number };

export type TreeNodeMoveEvent = {
  source: Node;
  target: Node;
  /** Ready to hand straight to a reorder action. */
  position: DropSlot;
  /** Folder id the source ends up under. null = tree root. */
  parentId: number | null;
};

export interface TreeEventMap extends HTMLElementEventMap {
  "bks-tree-node-move": CustomEvent<TreeNodeMoveEvent>;
  "bks-tree-node-click": CustomEvent<Node>;
}
