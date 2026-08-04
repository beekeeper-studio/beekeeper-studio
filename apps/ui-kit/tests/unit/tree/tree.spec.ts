import {
  buildDescendantsMap,
  collectVisibleItemIds,
  rangeSelectVisibleIds,
  toggleSelectedId,
} from "../../../lib/components/tree/tree";
import { FolderNode, ItemNode } from "../../../lib/components/tree/types";

function folderNode(
  id: number,
  parentId: number | null,
  children: FolderNode[] = []
): FolderNode {
  return {
    id: `folder-${id}`,
    parentId: parentId === null ? null : `folder-${parentId}`,
    type: "folder",
    name: `Folder ${id}`,
    draggable: true,
    children,
  };
}

function itemNode(
  id: number,
  parentId: number | null,
  position = 0
): ItemNode {
  return {
    id: `item-${id}`,
    parentId: parentId === null ? null : `folder-${parentId}`,
    type: "item",
    name: `Item ${id}`,
    position,
    draggable: true,
  };
}

describe("buildDescendantsMap", () => {
  const grandchild = folderNode(3, 2);
  const child = folderNode(2, 1, [grandchild]);
  const root = folderNode(1, null, [child]);

  it("maps each folder to all of its descendant ids", () => {
    const expected = new Map<FolderNode["id"], Set<FolderNode["id"]>>();
    expected.set("folder-1", new Set(["folder-2", "folder-3"]));
    expected.set("folder-2", new Set(["folder-3"]));
    expected.set("folder-3", new Set());
    expect(buildDescendantsMap([root, child, grandchild])).toStrictEqual(
      expected
    );
  });
});

describe("collectVisibleItemIds", () => {
  const childFolder = folderNode(2, 1);
  const rootFolder = folderNode(1, null, [childFolder]);
  const folders = [rootFolder, childFolder];
  const items = [
    itemNode(1, null, 0),
    itemNode(2, null, 1),
    itemNode(3, 1, 0),
    itemNode(4, 2, 0),
  ];

  it("returns root items when no folders are expanded", () => {
    expect(collectVisibleItemIds(folders, items, [])).toEqual([
      "item-1",
      "item-2",
    ]);
  });

  it("includes nested items when folders are expanded", () => {
    expect(collectVisibleItemIds(folders, items, ["folder-1"])).toEqual([
      "item-3",
      "item-1",
      "item-2",
    ]);
  });

  it("walks subfolders before sibling items within a folder", () => {
    expect(
      collectVisibleItemIds(folders, items, ["folder-1", "folder-2"])
    ).toEqual(["item-4", "item-3", "item-1", "item-2"]);
  });
});

describe("toggleSelectedId", () => {
  it("adds an id when it is not selected", () => {
    expect(toggleSelectedId([], "item-1")).toEqual(["item-1"]);
  });

  it("removes an id when it is already selected", () => {
    expect(toggleSelectedId(["item-1", "item-2"], "item-1")).toEqual([
      "item-2",
    ]);
  });
});

describe("rangeSelectVisibleIds", () => {
  const visibleIds = ["item-1", "item-2", "item-3"] as ItemNode["id"][];

  it("adds a contiguous visible range without removing existing selections", () => {
    expect(
      rangeSelectVisibleIds([], "item-1", "item-3", visibleIds)
    ).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("supports reverse anchor order", () => {
    expect(
      rangeSelectVisibleIds([], "item-3", "item-1", visibleIds)
    ).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("returns the original selection when ids are not visible", () => {
    expect(
      rangeSelectVisibleIds(["item-2"], "item-9", "item-3", visibleIds)
    ).toEqual(["item-2"]);
  });
});
