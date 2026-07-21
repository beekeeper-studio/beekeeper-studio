import {
  buildDescendantsMap,
  buildFolderNodes,
} from "../../../lib/components/tree/tree";
import { Folder } from "../../../lib/components/tree/types";

type Item = {
  id: number;
  position?: number;
  [foreignKey: string]: number | null | undefined;
};

describe("buildFolderNodes", () => {
  it("returns one node per folder, keeping the folder reference", () => {
    const folders: Folder[] = [
      { id: 1, name: "Root A", parentId: null },
      { id: 2, name: "Root B", parentId: null },
    ];
    const tree = buildFolderNodes(folders);
    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ id: 1, ref: folders[0], children: [] });
    expect(tree[1]).toMatchObject({ id: 2, ref: folders[1], children: [] });
    expect(tree[0].ref).toBe(folders[0]);
  });

  it("links children as references to the same node objects", () => {
    const folders: Folder[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
    ];
    const tree = buildFolderNodes(folders);
    const [root, child] = tree;
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(child);
    expect(child.children).toEqual([]);
  });

  it("keeps every folder in the flat array regardless of depth", () => {
    const folders: Folder[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
      { id: 3, name: "Grandchild", parentId: 2 },
    ];
    const tree = buildFolderNodes(folders);
    expect(tree.map((node) => node.id)).toEqual([1, 2, 3]);
    const byId = new Map(tree.map((node) => [node.id, node]));
    expect(byId.get(1)!.children[0]).toBe(byId.get(2));
    expect(byId.get(2)!.children[0]).toBe(byId.get(3));
  });

  it("leaves folders whose parent is missing without a parent link", () => {
    const folders: Folder[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Lost", parentId: 999 },
    ];
    const tree = buildFolderNodes(folders);
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });
});

describe("buildDescendantsMap", () => {
  const folders: Folder[] = [
    { id: 1, name: "Root", parentId: null },
    { id: 2, name: "Child", parentId: 1 },
    { id: 3, name: "Grandchild", parentId: 2 },
  ];
  const nodes = buildFolderNodes(folders);

  it("maps each folder to all of its descendant ids", () => {
    const expected = new Map<number, Set<number>>();
    expected.set(1, new Set([2, 3]));
    expected.set(2, new Set([3]));
    expected.set(3, new Set());
    expect(buildDescendantsMap(nodes)).toStrictEqual(expected);
  });
});
