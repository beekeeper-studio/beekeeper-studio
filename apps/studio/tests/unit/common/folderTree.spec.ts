import {
  buildTreeFolderNodes,
  buildTreeItemNodes,
  getDescendants,
  getSelfAndAnscestors,
} from "@/common/utils/folderTree";
import { IFolder } from "@/common/interfaces/IQueryFolder";

function folder(id: number, name: string, parentId: number | null): IFolder {
  return { id, name, parentId, personal: false };
}

describe("buildTreeFolderNodes", () => {
  it("returns one node per folder, keeping the folder reference", () => {
    const folders = [folder(1, "Root A", null), folder(2, "Root B", null)];
    const tree = buildTreeFolderNodes(folders);
    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({
      id: "folder-1",
      parentId: null,
      name: "Root A",
      ref: folders[0],
      children: [],
    });
    expect(tree[0].ref).toBe(folders[0]);
  });

  it("links children as references to the same node objects", () => {
    const folders = [folder(1, "Root", null), folder(2, "Child", 1)];
    const tree = buildTreeFolderNodes(folders);
    const [root, child] = tree;
    expect(child.parentId).toEqual("folder-1");
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(child);
    expect(child.children).toEqual([]);
  });

  it("keeps every folder in the flat array regardless of depth", () => {
    const tree = buildTreeFolderNodes([
      folder(1, "Root", null),
      folder(2, "Child", 1),
      folder(3, "Grandchild", 2),
    ]);
    expect(tree.map((node) => node.id)).toEqual([
      "folder-1",
      "folder-2",
      "folder-3",
    ]);
    const byId = new Map(tree.map((node) => [node.id, node]));
    expect(byId.get("folder-1")!.children[0]).toBe(byId.get("folder-2"));
    expect(byId.get("folder-2")!.children[0]).toBe(byId.get("folder-3"));
  });

  it("leaves folders whose parent is missing without a parent link", () => {
    const tree = buildTreeFolderNodes([
      folder(1, "Root", null),
      folder(2, "Lost", 999),
    ]);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });
});

describe("buildTreeItemNodes", () => {
  it("reads the parent folder from the given key", () => {
    const items = [
      { id: 1, queryFolderId: 5, position: 2 },
      { id: 2, queryFolderId: null, position: 1 },
      { id: 3, position: 1 },
    ];
    const nodes = buildTreeItemNodes(items, "queryFolderId");
    expect(nodes.map((node) => node.parentId)).toEqual([
      "folder-5",
      null,
      null,
    ]);
    expect(nodes[0]).toMatchObject({ id: "item-1", position: 2 });
    expect(nodes[0].ref).toBe(items[0]);
  });

  it("defaults a missing position to 0", () => {
    const [node] = buildTreeItemNodes([{ id: 1 }], "queryFolderId");
    expect(node.position).toEqual(0);
  });
});

describe("getSelfAndAnscestors", () => {
  it("walks up to the root", () => {
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
});

describe("getDescendants", () => {
  it("does not reach into a parallel branch", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 10, parentId: null },
      { id: 11, parentId: 10 },
    ] as IFolder[];

    expect(getDescendants(1, list)).toStrictEqual([
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
    ]);
    expect(getDescendants(3, list)).toStrictEqual([]);
    expect(getDescendants(10, list)).toStrictEqual([{ id: 11, parentId: 10 }]);
  });

  it("terminates on a corrupt cyclic list", () => {
    // Nothing enforced acyclicity before the closure tables existed, so an old
    // app.db can still contain a cycle. Hanging the renderer is not an option.
    const list = [
      { id: 1, parentId: 2 },
      { id: 2, parentId: 1 },
    ] as IFolder[];

    expect(() => getDescendants(1, list)).not.toThrow();
  });
});
