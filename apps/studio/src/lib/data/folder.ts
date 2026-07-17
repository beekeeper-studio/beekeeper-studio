import { IFolder } from "@/common/interfaces/IQueryFolder";

export function getAncestorsAndSelf(
  selfId: number,
  list: IFolder[],
  returnList: IFolder[] = []
): IFolder[] {
  const parentIndex = list.findIndex((item) => item.id === selfId);
  if (parentIndex === -1) {
    return returnList;
  }
  const parent = list[parentIndex];
  returnList.push(parent);
  return getAncestorsAndSelf(
    parent.parentId,
    list.toSpliced(parentIndex, 1),
    returnList
  );
}
