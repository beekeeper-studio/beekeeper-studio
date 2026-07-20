/**

Example of a Node object in json (simplified):

{
  id: 1,
  nodes: [
    { id: 2 },
    { id: 3, nodes: [ ... ]},
  ],
}

*/

import { DropPosition, DropSlot, Folderable, Node, Tree } from "./types";

function byPosition(a: { position?: number }, b: { position?: number }) {
  return (a.position ?? 0) - (b.position ?? 0);
}

/**
 * Build a folder tree of arbitrary depth from a flat list of folders and items.
 *
 * Every root folder is included, even when it has no items, so empty folders
 * stay visible in the sidebar. Items with no parent folder sit at the root
 * alongside the root folders. Items pointing at a folder that no longer exists
 * are left out of the tree and returned separately in `orphanedNodes`.
 * `parentKey` is the item field that points at a folder id (e.g.
 * 'queryFolderId' or 'connectionFolderId').
 */
export function buildTree<T>(
  folders: Folderable[],
  items: T[],
  parentKey?: keyof T & string
): Tree {
  const folderIds = new Set(folders.map((folder) => folder.id));
  const parentOf = (item: T) => (!parentKey ? null : (item[parentKey] ?? null)) as Folderable["id"];

  const itemNode = (item: T): Node => ({
    id: (item as { id: number }).id,
    parentId: parentOf(item),
    ref: item,
    type: "item",
  });

  const itemsUnder = (folderId: Folderable["id"]) =>
    items
      .filter((item) => parentOf(item) === folderId)
      .sort(byPosition)
      .map(itemNode);

  const nodesUnder = (parentId: Folderable["id"]): Node[] =>
    folders
      .filter((folder) => (folder.parentId ?? null) === parentId)
      .map((folder) => ({
        id: folder.id,
        parentId: folder.parentId,
        ref: folder,
        type: "folder",
        nodes: [
          ...(folder.id == null ? [] : nodesUnder(folder.id)),
          ...itemsUnder(folder.id),
        ],
      }));

  const orphanedNodes = items
    .filter((item) => {
      const parentId = parentOf(item);
      return parentId !== null && !folderIds.has(parentId);
    })
    .sort(byPosition)
    .map(itemNode);

  return {
    nodes: [...nodesUnder(null), ...itemsUnder(null)],
    orphanedNodes,
  };
}

/**
 * Whether a folder-backed list should render its empty state. A list with
 * folders but no items is NOT empty — the folders must still be shown.
 */
export function isFolderListEmpty(
  items: unknown[] | undefined | null,
  folders: unknown[] | undefined | null
): boolean {
  return !items?.length && !folders?.length;
}

/**
 * Where a dropped node lands among its new siblings.
 *
 * A slot is only meaningful next to an item, because before/after reference item
 * ids and folders are not in that list — subfolders render above items. So
 * dropping next to a folder decides the parent, not the slot.
 */
export function dropSlot(target: Node, position: DropPosition): DropSlot {
  if (target.type !== "item") {
    return { before: null };
  }
  return position === "after" ? { after: target.id } : { before: target.id };
}
