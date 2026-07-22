import { buildDescendantsMap } from "../../../lib/components/tree/tree";
import { FolderNode } from "../../../lib/components/tree/types";

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
