import { IFolder } from "@/common/interfaces/IQueryFolder";

export function getSelfAndAnscestors(
  selfId: number,
  list: IFolder[],
  returnList: IFolder[] = []
): IFolder[] {
  const index = list.findIndex((item) => item.id === selfId);

  if (index === -1) {
    return returnList;
  }

  const self = list[index];

  returnList.push(self);

  /** Anscestors are excluded from this list. */
  const filteredList = list.toSpliced(index, 1);

  return getSelfAndAnscestors(self.parentId, filteredList, returnList);
}

export function getDescendants(
  root: number | Map<number, IFolder[]>,
  list: IFolder[]
): IFolder[] {
  if (typeof root === "number") {
    root = new Map([[root, []]]);
  }

  /** Descendants are excluded from this list. */
  const filteredList: IFolder[] = [];
  let foundDescendant = false;

  for (const item of list) {
    if (root.has(item.parentId)) {
      root.get(item.parentId).push(item);
      if (!root.has(item.id)) {
        root.set(item.id, []);
      }
      foundDescendant = true;
    } else {
      filteredList.push(item);
    }
  }

  /** End when we don't find a descendant. */
  if (!foundDescendant) {
    return [...root.values()].flat();
  }

  return getDescendants(root, filteredList);
}

export function getSelfAndDescendants(selfId: number, list: IFolder[]) {
  const selfIndex = list.findIndex((item) => item.id === selfId);
  if (selfIndex === -1) {
    return [];
  }
  const self = list[selfIndex];
  const filteredList = list.toSpliced(selfIndex, 1);
  return [self, ...getDescendants(self.id, filteredList)];
}
