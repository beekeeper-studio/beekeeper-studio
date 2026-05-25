import { TreeItem } from "@beekeeperstudio/ui-kit";
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";

export function createTreeItems(
  folders: IConnectionFolder[],
  connections: any[],
  expandedState: Record<number, boolean>
): TreeItem[] {
  const byPosition = (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0);
  const folderIds = folders.map((f) => f.id);
  const rootFolders = folders.filter((f) => !f.parentId);

  const isExpanded = (folderId: number) => expandedState[folderId] ?? true;

  const connectionNode = (config: any): TreeItem => ({
    id: `connection-${config.id}`,
    type: "item",
    config,
  });

  const result: TreeItem[] = [];

  const lonely = connections
    .filter((c) => !c.connectionFolderId || !folderIds.includes(c.connectionFolderId))
    .sort(byPosition);
  for (const config of lonely) {
    result.push(connectionNode(config));
  }

  for (const folder of rootFolders) {
    const folderConnections = connections
      .filter((c) => c.connectionFolderId === folder.id)
      .sort(byPosition);
    const subfolders = folders.filter((f) => f.parentId === folder.id);

    const children: TreeItem[] = folderConnections.map(connectionNode);

    for (const sub of subfolders) {
      const subConnections = connections
        .filter((c) => c.connectionFolderId === sub.id)
        .sort(byPosition);
      children.push({
        id: `folder-${sub.id}`,
        type: "folder",
        name: sub.name,
        folder: sub,
        count: subConnections.length,
        expanded: isExpanded(sub.id),
        children: subConnections.map(connectionNode),
      });
    }

    result.push({
      id: `folder-${folder.id}`,
      type: "folder",
      name: folder.name,
      folder,
      count: folderConnections.length,
      expanded: isExpanded(folder.id),
      children,
    });
  }

  return result;
}
