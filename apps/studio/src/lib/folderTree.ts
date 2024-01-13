import type { ConnectionFolder } from "@/common/appdb/models/ConnectionFolder";

export type FolderEntity = ConnectionFolder;

export interface NonRootFolder<T> {
  id: number;
  name: string;
  description: string | null;
  items: T[];
  expanded: boolean;
  entity: FolderEntity;
  parentId?: number | null;
}

export interface RootFolder<T> {
  id: -1;
  name: "";
  description: "";
  items: T[];
  expanded: true;
}

export type Folder<T> = NonRootFolder<T> | RootFolder<T>;

export const ROOT_FOLDER_ID = -1;

/* Build a data structure for the FolderTree component */
export function buildFolderTreeData<T extends Record<string, any>>(options: {
  folders: FolderEntity[];
  items: T[];
  folderKey: string;
}): Folder<T>[] {
  const tree: Folder<T>[] = [];

  const rootFolder: RootFolder<T> = {
    id: -1,
    name: "",
    description: "",
    items: [],
    expanded: true,
  };

  for (const folder of options.folders) {
    tree.push({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      entity: folder,
      items: [],
      expanded: folder.expanded,
    });
  }

  for (const item of options.items) {
    const folderId = item[options.folderKey];
    if (!Number.isInteger(folderId) || folderId < 0) {
      rootFolder.items.push(item);
    } else {
      const folder = tree.find((f) => f.id === folderId);
      folder.items.push(item);
    }
  }

  tree.push(rootFolder);

  return tree;
}
