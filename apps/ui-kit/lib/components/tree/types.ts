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
  id: number;
  parentId: number | null;
  type: "folder";
  ref: Folder;
  children: FolderNode[];
};

export type ItemNode = {
  id: number;
  parentId: number | null;
  type: "item";
  ref: Item;
  position: number;
};

export type Node = FolderNode | ItemNode;

/**
 * Lightweight descriptor carried by a drag. Folders and items have separate id
 * spaces, so `type` is part of the identity.
 */
export type DragNode =
  | { type: "folder"; ref: Folder }
  | { type: "item"; ref: Item };

export type DropPosition = "before" | "after" | "inside";

export type DropTarget = {
  key: string;
  position: DropPosition;
};

/**
 * Where the source lands among its new siblings, relative to an item id.
 * `{ before: null }` means the first slot.
 */
export type DropSlot = { before: number | null } | { after: number };

export type TreeNodeMoveEvent = {
  source: DragNode;
  target: DragNode;
  /** Ready to hand straight to a reorder action. */
  position: DropSlot;
  /** Folder id the source ends up under. null = tree root. */
  parentId: number | null;
};

export interface TreeEventMap extends HTMLElementEventMap {
  "bks-tree-node-move": CustomEvent<TreeNodeMoveEvent>;
}
