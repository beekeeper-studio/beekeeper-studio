import { IFolder } from "@/common/interfaces/IQueryFolder";
import { getSelfAndAnscestors, getSelfAndDescendants } from "@/lib/data/folder";

describe("Tree utils", () => {
  it("getSelfAndAnscestors", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ] as IFolder[];
    expect(getSelfAndAnscestors(null, list)).toStrictEqual([]);
    expect(getSelfAndAnscestors(1, list)).toStrictEqual([
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAnscestors(2, list)).toStrictEqual([
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAnscestors(3, list)).toStrictEqual([
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAnscestors(4, list)).toStrictEqual([
      { id: 4, parentId: 3 },
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAnscestors(5, list)).toStrictEqual([
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ]);
    expect(getSelfAndAnscestors(6, list)).toStrictEqual([
      { id: 6, parentId: null },
    ]);
  });

  it("getSelfAndDescendants does not reach into a parallel branch", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 10, parentId: null },
      { id: 11, parentId: 10 },
    ] as IFolder[];

    expect(getSelfAndDescendants(1, list)).toStrictEqual([
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
    ]);
    expect(getSelfAndDescendants(3, list)).toStrictEqual([
      { id: 3, parentId: 2 },
    ]);
    expect(getSelfAndDescendants(10, list)).toStrictEqual([
      { id: 10, parentId: null },
      { id: 11, parentId: 10 },
    ]);
  });

  it("getSelfAndDescendants includes the root and every branch beneath it", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 3 },
      { id: 9, parentId: null },
    ] as IFolder[];

    expect(getSelfAndDescendants(1, list)).toStrictEqual([
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 3 },
    ]);
    expect(getSelfAndDescendants(3, list)).toStrictEqual([
      { id: 3, parentId: 1 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 3 },
    ]);
    expect(getSelfAndDescendants(5, list)).toStrictEqual([
      { id: 5, parentId: 3 },
    ]);
    expect(getSelfAndDescendants(9, list)).toStrictEqual([
      { id: 9, parentId: null },
    ]);
  });

  it("terminates on a corrupt cyclic list", () => {
    // Nothing enforced acyclicity before the closure tables existed, so an old
    // app.db can still contain a cycle. Hanging the renderer is not an option.
    const list = [
      { id: 1, parentId: 2 },
      { id: 2, parentId: 1 },
    ] as IFolder[];

    expect(() => getSelfAndDescendants(1, list)).not.toThrow();
  });
});
