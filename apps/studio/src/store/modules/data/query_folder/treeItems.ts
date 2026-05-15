import { TreeItem } from "@beekeeperstudio/ui-kit";
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import ISavedQuery from "@/common/interfaces/ISavedQuery";

export function createTreeItems(
  folders: IQueryFolder[],
  queries: ISavedQuery[],
  expandedState: Record<number, boolean>
): TreeItem[] {
  const byPosition = (a: ISavedQuery, b: ISavedQuery) =>
    (a.position ?? 0) - (b.position ?? 0);
  const folderIds = folders.map((f) => f.id);
  const rootFolders = folders.filter((f) => !f.parentId);

  const isExpanded = (folderId: number) => expandedState[folderId] ?? true;

  const queryNode = (query: ISavedQuery): TreeItem => ({
    id: `query-${query.id}`,
    type: "item",
    query,
  });

  const result: TreeItem[] = [];

  const lonely = queries
    .filter((q) => !q.queryFolderId || !folderIds.includes(q.queryFolderId))
    .sort(byPosition);
  for (const query of lonely) {
    result.push(queryNode(query));
  }

  for (const folder of rootFolders) {
    const folderQueries = queries
      .filter((q) => q.queryFolderId === folder.id)
      .sort(byPosition);
    const subfolders = folders.filter((f) => f.parentId === folder.id);

    const children: TreeItem[] = folderQueries.map(queryNode);

    for (const sub of subfolders) {
      const subQueries = queries
        .filter((q) => q.queryFolderId === sub.id)
        .sort(byPosition);
      children.push({
        id: `folder-${sub.id}`,
        type: "folder",
        name: sub.name,
        folder: sub,
        count: subQueries.length,
        expanded: isExpanded(sub.id),
        children: subQueries.map(queryNode),
      });
    }

    result.push({
      id: `folder-${folder.id}`,
      type: "folder",
      name: folder.name,
      folder,
      count: folderQueries.length,
      expanded: isExpanded(folder.id),
      children,
    });
  }

  return result;
}
