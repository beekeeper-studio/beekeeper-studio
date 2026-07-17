import {
  buildTree,
  isFolderListEmpty,
} from "../../../lib/components/tree/tree";
import { Folderable } from "../../../lib/components/tree/types";

type Item = {
  id: number;
  position?: number;
  [foreignKey: string]: number | null | undefined;
};

describe("buildFolderTree", () => {
  it("includes empty root folders", () => {
    const folders: Folderable[] = [
      { id: 1, name: "Root A", parentId: null },
      { id: 2, name: "Root B", parentId: null },
    ];
    const queries: Item[] = [];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        { id: 1, parentId: null, type: "folder", ref: folders[0], nodes: [] },
        { id: 2, parentId: null, type: "folder", ref: folders[1], nodes: [] },
      ],
      orphanedNodes: [],
    });
  });

  it("copies the reference of folders and items", () => {
    const folders: Folderable[] = [
      { id: 1, name: "Root A", parentId: null },
    ];
    const queries: Item[] = [
      {id: 1, queryFolderId: 1},
    ];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree.nodes[0].type).toStrictEqual("folder");
    expect(tree.nodes[0].ref).toStrictEqual(folders[0]);
    expect(tree.nodes[0].nodes![0].type).toStrictEqual("item");
    expect(tree.nodes[0].nodes![0].ref).toStrictEqual(queries[0]);
  });

  it("only returns root folders at the top level", () => {
    const folders: Folderable[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
    ];
    const queries: Item[] = [];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 2, parentId: 1, type: "folder", ref: folders[1], nodes: [] },
          ],
        },
      ],
      orphanedNodes: [],
    });
  });

  it("puts subfolders before items within a folder", () => {
    const folders: Folderable[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
    ];
    const queries: Item[] = [{ id: 10, queryFolderId: 1 }];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 2, parentId: 1, type: "folder", ref: folders[1], nodes: [] },
            { id: 10, parentId: 1, type: "item", ref: queries[0] },
          ],
        },
      ],
      orphanedNodes: [],
    });
  });

  it("nests folders to arbitrary depth", () => {
    const folders: Folderable[] = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
      { id: 3, name: "Grandchild", parentId: 2 },
    ];
    const queries: Item[] = [{ id: 10, queryFolderId: 3 }];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            {
              id: 2,
              parentId: 1,
              type: "folder",
              ref: folders[1],
              nodes: [
                {
                  id: 3,
                  parentId: 2,
                  type: "folder",
                  ref: folders[2],
                  nodes: [
                    { id: 10, parentId: 3, type: "item", ref: queries[0] },
                  ],
                },
              ],
            },
          ],
        },
      ],
      orphanedNodes: [],
    });
  });

  it("sorts items within a folder by position", () => {
    const folders: Folderable[] = [{ id: 1, name: "Root", parentId: null }];
    const queries: Item[] = [
      { id: 10, queryFolderId: 1, position: 2 },
      { id: 11, queryFolderId: 1, position: 1 },
    ];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 11, parentId: 1, type: "item", ref: queries[1] },
            { id: 10, parentId: 1, type: "item", ref: queries[0] },
          ],
        },
      ],
      orphanedNodes: [],
    });
  });

  it("works with the connection foreign key too", () => {
    const folders: Folderable[] = [{ id: 5, name: "C", parentId: null }];
    const connections: Item[] = [{ id: 1, connectionFolderId: 5 }];
    const tree = buildTree(folders, connections, "connectionFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 5,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 1, parentId: 5, type: "item", ref: connections[0] },
          ],
        },
      ],
      orphanedNodes: [],
    });
  });

  it("places items with no parent at the root", () => {
    const folders: Folderable[] = [{ id: 1, name: "Root", parentId: null }];
    const queries: Item[] = [
      { id: 10, queryFolderId: 1 },
      { id: 11, queryFolderId: null },
    ];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 10, parentId: 1, type: "item", ref: queries[0] },
          ],
        },
        { id: 11, parentId: null, type: "item", ref: queries[1] },
      ],
      orphanedNodes: [],
    });
  });

  it("collects items whose parent folder does not exist into orphanedNodes", () => {
    const folders: Folderable[] = [{ id: 1, name: "Root", parentId: null }];
    const queries: Item[] = [
      { id: 10, queryFolderId: 1 },
      { id: 99, queryFolderId: 999 },
    ];
    const tree = buildTree(folders, queries, "queryFolderId");
    expect(tree).toEqual({
      nodes: [
        {
          id: 1,
          parentId: null,
          type: "folder",
          ref: folders[0],
          nodes: [
            { id: 10, parentId: 1, type: "item", ref: queries[0] },
          ],
        },
      ],
      orphanedNodes: [
        { id: 99, parentId: 999, type: "item", ref: queries[1] },
      ],
    });
  });
});

describe("isFolderListEmpty", () => {
  it("is true only when there are no items and no folders", () => {
    expect(isFolderListEmpty([], [])).toBe(true);
    expect(isFolderListEmpty(null, undefined)).toBe(true);
  });

  it("is false when folders exist even without items", () => {
    const folders: Folderable[] = [{ id: 1, name: "Root", parentId: null }];
    const queries: Item[] = [];
    expect(isFolderListEmpty(queries, folders)).toBe(false);
  });

  it("is false when items exist even without folders", () => {
    const queries: Item[] = [{ id: 10, queryFolderId: null }];
    expect(isFolderListEmpty(queries, [])).toBe(false);
  });
});
