export type TreeItem = {
  id: string | number;
  type: "folder" | "item";
  name?: string;
  count?: number;
  children?: TreeItem[];
  expanded?: boolean;
  [key: string]: any;
};

export type TreeState = {
  expanded: Record<string, boolean>;
  hover: {
    folderId: TreeItem["id"] | null;
    draggedNode: TreeItem | null;
  };
};

export interface TreeListEventMap extends HTMLElementEventMap {
  "bks-item-change": CustomEvent<{
    event: { type: "added" | "moved"; element: TreeItem; newIndex: number };
    draggableEvent: any;
    siblings: TreeItem[];
    targetFolder: any;
  }>;
  "bks-item-click": CustomEvent<{ item: TreeItem }>;
  "bks-folder-toggle": CustomEvent<{ folder: TreeItem; expanded: boolean }>;
  "bks-folder-drop": CustomEvent<{ folder: TreeItem; draggedNode: TreeItem }>;
  "bks-folder-contextmenu": CustomEvent<{ event: Event; item: TreeItem }>;
}
