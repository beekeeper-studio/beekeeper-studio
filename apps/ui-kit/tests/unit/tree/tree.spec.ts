import {
  buildDescendantsMap,
  destinationOf,
  zoneAt,
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

function itemNode(id: number, parentId: number | null): ItemNode {
  return {
    id: `item-${id}`,
    parentId: parentId === null ? null : `folder-${parentId}`,
    type: "item",
    name: `Item ${id}`,
    draggable: true,
  };
}

/** A 100px tall row whose top is at y=0, with the cursor `offset` down it. */
function dragEventAt(offset: number): DragEvent {
  return {
    clientY: offset * 100,
    currentTarget: {
      getBoundingClientRect: () => ({ top: 0, height: 100 }),
    },
  } as unknown as DragEvent;
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

describe("zoneAt", () => {
  const draggedFolder = folderNode(9, null);
  const draggedItem = itemNode(9, null);
  const targetFolder = folderNode(1, null);
  const targetItem = itemNode(1, null);

  it("splits an item row in half", () => {
    expect(zoneAt(draggedItem, targetItem, dragEventAt(0.4))).toEqual("before");
    expect(zoneAt(draggedItem, targetItem, dragEventAt(0.6))).toEqual("after");
  });

  it("gives a folder row edges a dragged folder can land beside", () => {
    expect(zoneAt(draggedFolder, targetFolder, dragEventAt(0.1))).toEqual(
      "before"
    );
    expect(zoneAt(draggedFolder, targetFolder, dragEventAt(0.5))).toEqual(
      "inside"
    );
    expect(zoneAt(draggedFolder, targetFolder, dragEventAt(0.9))).toEqual(
      "after"
    );
  });

  it("drops an item into a folder wherever it is released", () => {
    expect(zoneAt(draggedItem, targetFolder, dragEventAt(0.1))).toEqual(
      "inside"
    );
    expect(zoneAt(draggedItem, targetFolder, dragEventAt(0.9))).toEqual(
      "inside"
    );
  });

  it("drops an item into a folder when nothing is being dragged yet", () => {
    expect(zoneAt(null, targetFolder, dragEventAt(0.1))).toEqual("inside");
  });
});

describe("destinationOf", () => {
  it("lands in the folder it was dropped into", () => {
    expect(destinationOf(folderNode(1, 5), "inside")).toEqual("folder-1");
  });

  it("joins the folder holding the node it was dropped beside", () => {
    expect(destinationOf(folderNode(1, 5), "before")).toEqual("folder-5");
    expect(destinationOf(folderNode(1, 5), "after")).toEqual("folder-5");
    expect(destinationOf(itemNode(1, 5), "before")).toEqual("folder-5");
  });

  it("reaches the top level through a node that sits there", () => {
    expect(destinationOf(folderNode(1, null), "after")).toBeNull();
    expect(destinationOf(itemNode(1, null), "before")).toBeNull();
  });
});
