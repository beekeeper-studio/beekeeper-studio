import {
  buildFolderNodes,
  buildItemNodes,
  getSelfAndAncestors,
  parseReorderTarget,
} from "@/common/utils/folderTree";
import { IFolder } from "@/common/interfaces/IQueryFolder";

function folder(id: number, name: string, parentId: number | null): IFolder {
  // The sharing fields on IFolder play no part in building nodes.
  return { id, name, parentId, personal: false } as IFolder;
}

describe("buildFolderNodes", () => {
  it("returns one node per folder, keeping the folder reference", () => {
    const folders = [folder(1, "Root A", null), folder(2, "Root B", null)];
    const tree = buildFolderNodes(folders);
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
    const tree = buildFolderNodes(folders);
    const [root, child] = tree;
    expect(child.parentId).toEqual("folder-1");
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(child);
    expect(child.children).toEqual([]);
  });

  it("keeps every folder in the flat array regardless of depth", () => {
    const tree = buildFolderNodes([
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
    const tree = buildFolderNodes([
      folder(1, "Root", null),
      folder(2, "Lost", 999),
    ]);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });
});

describe("buildItemNodes", () => {
  it("reads the parent folder from the given key", () => {
    const items = [
      { id: 1, title: "One", queryFolderId: 5 },
      { id: 2, title: "Two", queryFolderId: null },
      { id: 3, title: "Three" },
    ];
    const nodes = buildItemNodes(items, "queryFolderId", "title");
    expect(nodes.map((node) => node.parentId)).toEqual([
      "folder-5",
      null,
      null,
    ]);
    expect(nodes[0]).toMatchObject({ id: "item-1", name: "One" });
    expect(nodes[0].ref).toBe(items[0]);
  });
});

describe("getSelfAndAncestors", () => {
  it("walks up to the root", () => {
    const list = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: 3 },
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ] as IFolder[];
    expect(getSelfAndAncestors(null, list)).toStrictEqual([]);
    expect(getSelfAndAncestors(1, list)).toStrictEqual([
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAncestors(2, list)).toStrictEqual([
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAncestors(3, list)).toStrictEqual([
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAncestors(4, list)).toStrictEqual([
      { id: 4, parentId: 3 },
      { id: 3, parentId: 2 },
      { id: 2, parentId: 1 },
      { id: 1, parentId: null },
    ]);
    expect(getSelfAndAncestors(5, list)).toStrictEqual([
      { id: 5, parentId: 6 },
      { id: 6, parentId: null },
    ]);
    expect(getSelfAndAncestors(6, list)).toStrictEqual([
      { id: 6, parentId: null },
    ]);
  });
});

describe("parseReorderTarget", () => {
  const folderNodes = buildFolderNodes([
    folder(1, "Work", null),
    folder(2, "Staging", 1),
  ]);
  const itemNodes = buildItemNodes(
    [
      { id: 10, name: "Local", connectionFolderId: null, position: 1 },
      { id: 11, name: "Prod", connectionFolderId: 2, position: 2 },
    ],
    "connectionFolderId",
    "name"
  );

  it("lands first inside the folder it was dropped on", () => {
    expect(
      parseReorderTarget({
        source: itemNodes[0],
        target: folderNodes[1],
        position: "inside",
      })
    ).toEqual({ parentId: 2, position: { before: null } });
  });

  it("inherits the folder of the sibling it lands after", () => {
    expect(
      parseReorderTarget({
        source: itemNodes[0],
        target: itemNodes[1],
        position: "after",
      })
    ).toEqual({ parentId: 2, position: { after: 11 } });
  });

  it("inherits the top level from a sibling that has no folder", () => {
    expect(
      parseReorderTarget({
        source: itemNodes[1],
        target: itemNodes[0],
        position: "before",
      })
    ).toEqual({ parentId: null, position: { before: 10 } });
  });

  it("refuses to order an item relative to a folder", () => {
    // Folders have no position, so before/after has no meaning against one.
    expect(() =>
      parseReorderTarget({
        source: itemNodes[0],
        target: folderNodes[1],
        position: "before",
      })
    ).toThrow();
  });
});
