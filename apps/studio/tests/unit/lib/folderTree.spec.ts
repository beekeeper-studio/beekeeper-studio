import { buildFolderTreeData, FolderEntity } from "@/lib/folderTree";

describe("folderTree", () => {
  it("buildFolderTreeData", () => {
    const folders = [
      {
        id: 1,
        name: "foo",
        description: "foo description",
        expanded: true,
      },
      {
        id: 2,
        name: "bar",
        description: "bar description",
        expanded: false,
      },
    ] as FolderEntity[];

    const items = [
      {
        name: "baz",
        folderId: 1,
        otherProp: "i'm a string",
      },
      {
        name: "qux",
        folderId: null,
        anotherProp: "i'm a string",
      },
    ];

    const folderTreeData = buildFolderTreeData({
      folders,
      items,
      folderKey: "folderId",
    });

    expect(folderTreeData).toStrictEqual([
      {
        id: 1,
        name: "foo",
        description: "foo description",
        expanded: true,
        entity: folders[0],
        items: [
          {
            name: "baz",
            folderId: 1,
            otherProp: "i'm a string",
          },
        ],
      },
      {
        id: 2,
        name: "bar",
        description: "bar description",
        expanded: false,
        entity: folders[1],
        items: [],
      },
      {
        id: -1,
        name: "",
        description: "",
        expanded: true,
        items: [
          {
            name: "qux",
            folderId: null,
            anotherProp: "i'm a string",
          },
        ],
      },
    ]);
  });
});
