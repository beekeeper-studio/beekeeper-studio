import { describe, it, expect, vi } from "vitest";
import { MongoDBClient, urlUsesGssapi } from "@commercial/backend/lib/db/clients/mongodb"

describe("urlUsesGssapi", () => {
  it("detects GSSAPI on a standard URL", () => {
    expect(urlUsesGssapi("mongodb://user%40REALM@host.example.com/?authMechanism=GSSAPI")).toBe(true)
  })

  it("is case-insensitive on the mechanism value", () => {
    expect(urlUsesGssapi("mongodb://host/?authMechanism=gssapi")).toBe(true)
  })

  it("detects GSSAPI alongside other query params", () => {
    expect(urlUsesGssapi("mongodb://host/?authMechanism=GSSAPI&authMechanismProperties=SERVICE_NAME:mongodb")).toBe(true)
  })

  it("detects GSSAPI on a multi-host seed list the URL parser can't handle", () => {
    expect(urlUsesGssapi("mongodb://h1.example.com,h2.example.com:27017/?authMechanism=GSSAPI")).toBe(true)
  })

  it("returns false for other auth mechanisms", () => {
    expect(urlUsesGssapi("mongodb://user:pass@host/?authMechanism=SCRAM-SHA-256")).toBe(false)
  })

  it("returns false when no auth mechanism is given", () => {
    expect(urlUsesGssapi("mongodb://user:pass@host/db")).toBe(false)
  })

  it("returns false for empty/undefined input", () => {
    expect(urlUsesGssapi("")).toBe(false)
    expect(urlUsesGssapi(undefined as unknown as string)).toBe(false)
  })
})

describe("MongoDBClient.listTables", () => {
  it("returns collections sorted by name", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const collections = [{ name: "users" }, { name: "Accounts" }, { name: "orders" }, { name: "audit_log" }]
    client.conn = {
      db: () => ({ listCollections: () => ({ toArray: async () => collections }) }),
    } as any

    const tables = await client.listTables()

    expect(tables.map((t) => t.name)).toEqual(["Accounts", "audit_log", "orders", "users"])
  })
})

describe("MongoDBClient.executeQuery read-only", () => {
  function createClient() {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const execute = vi.fn().mockResolvedValue([])
    client.queryLeaf = { execute } as any
    return { client, execute }
  }

  it("blocks writes when forceReadOnly is set", async () => {
    const { client, execute } = createClient()

    await expect(
      client.executeQuery("DELETE FROM users WHERE id = 1", { forceReadOnly: true })
    ).rejects.toThrow(/Read-Only Mode/)
    expect(execute).not.toHaveBeenCalled()
  })

  it("runs nothing when a script mixes reads and writes", async () => {
    const { client, execute } = createClient()

    await expect(
      client.executeQuery("SELECT * FROM users; DELETE FROM users WHERE id = 1", { forceReadOnly: true })
    ).rejects.toThrow(/Read-Only Mode/)
    expect(execute).not.toHaveBeenCalled()
  })

  it("allows reads when forceReadOnly is set", async () => {
    const { client, execute } = createClient()

    await client.executeQuery("SELECT * FROM users", { forceReadOnly: true })

    expect(execute).toHaveBeenCalledWith("SELECT * FROM users")
  })

  it("allows writes when no options are passed", async () => {
    const { client, execute } = createClient()

    await client.executeQuery("DELETE FROM users WHERE id = 1")

    expect(execute).toHaveBeenCalledTimes(1)
  })
})

describe("MongoDBClient streaming", () => {
  function fakeCursor(docs: any[]) {
    let index = 0
    return {
      on: vi.fn(),
      close: vi.fn(),
      hasNext: async () => index < docs.length,
      next: async () => docs[index++],
      readBufferedDocuments: () => {
        const rest = docs.slice(index)
        index = docs.length
        return rest
      },
    }
  }

  it("returns row values in the same order as the columns", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docs = [
      { _id: "1", zebra: "Z1", apple: "A1", mango: "M1" },
      { _id: "2", mango: "M2", zebra: "Z2" },
    ]
    vi.spyOn(client as any, "buildSelectTopCursor").mockReturnValue(fakeCursor(docs))
    vi.spyOn(client, "listTableColumns").mockResolvedValue(
      ["_id", "apple", "mango", "zebra"].map((columnName) => ({ tableName: "qa_order", columnName, dataType: "string" })) as any
    )

    const { columns, cursor } = await client.selectTopStream("qa_order", [], [], 100)
    await cursor.start()
    const rows = await cursor.read()

    expect(columns.map((c) => c.columnName)).toEqual(["_id", "apple", "mango", "zebra"])
    expect(rows).toEqual([
      ["1", "A1", "M1", "Z1"],
      ["2", undefined, "M2", "Z2"],
    ])
  })

  it("lines up query results with the columns when documents differ in field order", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docs = [
      { title: "ACADEMY DINOSAUR", year: 2006 },
      { year: 2007, title: "ACE GOLDFINGER", rating: "G" },
    ]
    client.queryLeaf = { executeCursor: async () => fakeCursor(docs) } as any

    const { cursor } = await client.queryStream("SELECT * FROM films", 100)
    await cursor.start()
    const rows = await cursor.read()

    expect(cursor.columns.map((c) => c.columnName)).toEqual(["title", "year", "rating"])
    expect(rows).toEqual([
      ["ACADEMY DINOSAUR", 2006, undefined],
      ["ACE GOLDFINGER", 2007, "G"],
    ])
  })
})
