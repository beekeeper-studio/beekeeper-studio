import { IFolder } from "@/common/interfaces/IQueryFolder";

export interface FolderTreeSubfolder<T> {
  folder: IFolder;
  items: T[];
}

export interface FolderTreeNode<T> {
  folder: IFolder;
  items: T[];
  subfolders: FolderTreeSubfolder<T>[];
}

function byPosition(a: { position?: number }, b: { position?: number }) {
  return (a.position ?? 0) - (b.position ?? 0);
}

/**
 * Build a one-level-deep folder tree from a flat list of folders and items.
 *
 * Every root folder is included, even when it has no items, so empty folders
 * stay visible in the sidebar. `foreignKey` is the item field that points at a
 * folder id (e.g. 'queryFolderId' or 'connectionFolderId').
 */
export function buildFolderTree<T>(
  folders: IFolder[],
  items: T[],
  foreignKey: keyof T & string
): FolderTreeNode<T>[] {
  const childrenOf = (folderId: IFolder["id"]) =>
    items
      .filter((item) => (item[foreignKey] as unknown) === folderId)
      .sort(byPosition);

  return folders
    .filter((folder) => !folder.parentId)
    .map((folder) => ({
      folder,
      items: childrenOf(folder.id),
      subfolders: folders
        .filter((f) => f.parentId === folder.id)
        .map((subfolder) => ({
          folder: subfolder,
          items: childrenOf(subfolder.id),
        })),
    }));
}

/**
 * Items that don't belong to any existing folder (no folder id, or a folder id
 * that no longer exists). Position-sorted.
 */
export function getLonelyItems<T>(
  folders: IFolder[],
  items: T[],
  foreignKey: keyof T & string
): T[] {
  const folderIds = folders.map((f) => f.id);
  return [...items]
    .filter((item) => {
      const id = item[foreignKey] as unknown as IFolder["id"];
      return !id || !folderIds.includes(id);
    })
    .sort(byPosition);
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
