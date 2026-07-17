import { IFolder } from "@/common/interfaces/IQueryFolder";
import { getAncestorsAndSelf } from "@/lib/data/folder";

describe("Tree utils", () => {
  it("getAncestorsAndSelf", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ] as IFolder[];
    expect(getAncestorsAndSelf(null, list)).toStrictEqual([]);
    expect(getAncestorsAndSelf(1, list)).toStrictEqual([
      { id: 1, parentId: null },
    ]);
    expect(getAncestorsAndSelf(2, list)).toStrictEqual([
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getAncestorsAndSelf(3, list)).toStrictEqual([
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getAncestorsAndSelf(4, list)).toStrictEqual([
      { id: 4, parentId: 3 },
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getAncestorsAndSelf(5, list)).toStrictEqual([
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ]);
    expect(getAncestorsAndSelf(6, list)).toStrictEqual([
      { id: 6, parentId: null },
    ]);
  });
});
