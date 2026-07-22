/**
 * A folder in the tree. `children` holds references to its subfolder nodes, so
 * a flat array of these still describes the whole tree.
 */
export type FolderNode = {
  id: `folder-${number}`;
  parentId: `folder-${number}` | null;
  type: "folder";
  name: string;
  draggable: boolean;
  children: FolderNode[];
};

export type ItemNode = {
  id: `item-${number}`;
  parentId: `folder-${number}` | null;
  type: "item";
  position: number;
  draggable: boolean;
};

export type Node = FolderNode | ItemNode;

export type DropPosition = "before" | "after" | "inside";

export type DropTarget = {
  id: Node["id"];
  position: DropPosition;
};

export type TreeNodeMoveEvent = {
  source: Node;
  target: Node;
  /** Where the source lands relative to the target. */
  position: DropPosition;
};

export interface TreeEventMap extends HTMLElementEventMap {
  "bks-tree-node-move": CustomEvent<TreeNodeMoveEvent>;
  "bks-tree-node-click": CustomEvent<Node>;
}
