import { buildFolderTree, getLonelyItems, isFolderListEmpty } from "../../../lib/components/folder-tree/folderTree"

const folders = [
  { id: 1, name: "Root A", parentId: null },
  { id: 2, name: "Root B", parentId: null },
  { id: 3, name: "Child of A", parentId: 1 },
]

const queries = [
  { id: 10, queryFolderId: 1, position: 2 },
  { id: 11, queryFolderId: 1, position: 1 },
  { id: 12, queryFolderId: 3 },
  { id: 13, queryFolderId: null },
  { id: 14, queryFolderId: 999 }, // points at a folder that no longer exists
]

describe("buildFolderTree", () => {
  it("includes empty root folders", () => {
    const tree = buildFolderTree(folders, [], "queryFolderId")
    expect(tree.map((n) => n.folder.id)).toEqual([1, 2])
    expect(tree.every((n) => n.items.length === 0)).toBe(true)
  })

  it("only returns root folders at the top level", () => {
    const tree = buildFolderTree(folders, queries, "queryFolderId")
    expect(tree.map((n) => n.folder.id)).toEqual([1, 2])
  })

  it("nests subfolders one level deep", () => {
    const tree = buildFolderTree(folders, queries, "queryFolderId")
    const rootA = tree.find((n) => n.folder.id === 1)
    expect(rootA.subfolders.map((s) => s.folder.id)).toEqual([3])
    expect(rootA.subfolders[0].items.map((q) => q.id)).toEqual([12])
  })

  it("sorts items within a folder by position", () => {
    const tree = buildFolderTree(folders, queries, "queryFolderId")
    const rootA = tree.find((n) => n.folder.id === 1)
    expect(rootA.items.map((q) => q.id)).toEqual([11, 10])
  })

  it("works with the connection foreign key too", () => {
    const connFolders = [{ id: 5, name: "C", parentId: null }]
    const connections = [{ id: 1, connectionFolderId: 5 }]
    const tree = buildFolderTree(connFolders, connections, "connectionFolderId")
    expect(tree[0].items.map((c) => c.id)).toEqual([1])
  })
})

describe("getLonelyItems", () => {
  it("returns items with no folder or an orphaned folder id", () => {
    const lonely = getLonelyItems(folders, queries, "queryFolderId")
    expect(lonely.map((q) => q.id).sort()).toEqual([13, 14])
  })

  it("returns an empty array when every item lives in a folder", () => {
    const grouped = [{ id: 1, queryFolderId: 1 }]
    expect(getLonelyItems(folders, grouped, "queryFolderId")).toEqual([])
  })
})

describe("isFolderListEmpty", () => {
  it("is true only when there are no items and no folders", () => {
    expect(isFolderListEmpty([], [])).toBe(true)
    expect(isFolderListEmpty(null, undefined)).toBe(true)
  })

  it("is false when folders exist even without items", () => {
    expect(isFolderListEmpty([], folders)).toBe(false)
  })

  it("is false when items exist even without folders", () => {
    expect(isFolderListEmpty(queries, [])).toBe(false)
  })
})
