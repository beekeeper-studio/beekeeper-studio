import { describe, it, expect, vi } from "vitest";
import { MongoDBClient, urlUsesGssapi } from "@commercial/backend/lib/db/clients/mongodb"
import { ObjectId } from "mongodb";

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

  it("falls back to the document fields when the table columns come back empty", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docs = [
      { _id: "1", name: "a" },
      { _id: "2", name: "b" },
    ]
    vi.spyOn(client as any, "buildSelectTopCursor").mockReturnValue(fakeCursor(docs))
    vi.spyOn(client, "listTableColumns").mockResolvedValue([])

    const { cursor } = await client.selectTopStream("qa_empty_sample", [], [], 100)
    await cursor.start()
    const rows = await cursor.read()

    expect(cursor.columns.map((c) => c.columnName)).toEqual(["_id", "name"])
    expect(rows).toEqual([
      ["1", "a"],
      ["2", "b"],
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


describe("MongoDBClient.updateValues", () => {
  it("emits dotted-path $set for changed fields and leaves untouched BSON Date sibling intact", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docId = new ObjectId()
    const initialDate = new Date("2023-01-15T12:00:00.000Z")

    const existingDoc = {
      _id: docId,
      meta: {
        created_at: initialDate,
        author: "alice",
        version: 1,
      },
    }

    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(existingDoc),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        ...existingDoc,
        meta: {
          created_at: initialDate,
          author: "alice",
          version: 2,
        },
      }),
    }
    const mockConnection = {
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any

    const update = {
      table: "test_table",
      column: "meta",
      primaryKeys: [{ column: "_id", value: docId.toHexString() }],
      value: {
        created_at: "2023-01-15T12:00:00.000Z",
        author: "alice",
        version: 2,
      },
      oldValue: {
        created_at: "2023-01-15T12:00:00.000Z",
        author: "alice",
        version: 1,
      },
    }

    await client.updateValues([update as any], mockConnection)

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1)
    const [, updateDoc] = mockCollection.findOneAndUpdate.mock.calls[0]
    expect(updateDoc).not.toHaveProperty("$set.meta")
    expect(updateDoc.$set).toEqual({
      "meta.version": 2,
    })
    expect("meta.created_at" in (updateDoc.$set || {})).toBe(false)
    expect("meta.author" in (updateDoc.$set || {})).toBe(false)
  })

  it("emits $unset when a subdocument field is deleted", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docId = new ObjectId()

    const existingDoc = {
      _id: docId,
      meta: {
        created_at: new Date("2023-01-15T12:00:00.000Z"),
        author: "alice",
        version: 1,
      },
    }

    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(existingDoc),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        _id: docId,
        meta: {
          created_at: new Date("2023-01-15T12:00:00.000Z"),
          version: 1,
        },
      }),
    }
    const mockConnection = {
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any

    const update = {
      table: "test_table",
      column: "meta",
      primaryKeys: [{ column: "_id", value: docId.toHexString() }],
      value: {
        created_at: "2023-01-15T12:00:00.000Z",
        version: 1,
      },
      oldValue: {
        created_at: "2023-01-15T12:00:00.000Z",
        author: "alice",
        version: 1,
      },
    }

    await client.updateValues([update as any], mockConnection)

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1)
    const [, updateDoc] = mockCollection.findOneAndUpdate.mock.calls[0]
    expect(updateDoc.$unset).toEqual({
      "meta.author": "",
    })
    expect(updateDoc).not.toHaveProperty("$set")
  })

  it("emits both $set and $unset when modifying and deleting nested fields simultaneously", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docId = new ObjectId()

    const existingDoc = {
      _id: docId,
      meta: {
        created_at: new Date("2023-01-15T12:00:00.000Z"),
        author: "alice",
        version: 1,
      },
    }

    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(existingDoc),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        _id: docId,
        meta: {
          created_at: new Date("2023-01-15T12:00:00.000Z"),
          version: 2,
        },
      }),
    }
    const mockConnection = {
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any

    const update = {
      table: "test_table",
      column: "meta",
      primaryKeys: [{ column: "_id", value: docId.toHexString() }],
      value: {
        created_at: "2023-01-15T12:00:00.000Z",
        version: 2,
      },
      oldValue: {
        created_at: "2023-01-15T12:00:00.000Z",
        author: "alice",
        version: 1,
      },
    }

    await client.updateValues([update as any], mockConnection)

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1)
    const [, updateDoc] = mockCollection.findOneAndUpdate.mock.calls[0]
    expect(updateDoc.$set).toEqual({
      "meta.version": 2,
    })
    expect(updateDoc.$unset).toEqual({
      "meta.author": "",
    })
    expect("meta.created_at" in (updateDoc.$set || {})).toBe(false)
  })

  it("restores modified date string to a native BSON Date instance in $set", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docId = new ObjectId()
    const oldDate = new Date("2023-01-15T12:00:00.000Z")
    const newDateString = "2024-06-01T10:00:00.000Z"
    const expectedNewDate = new Date(newDateString)

    const existingDoc = {
      _id: docId,
      meta: {
        created_at: oldDate,
        author: "alice",
      },
    }

    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(existingDoc),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        _id: docId,
        meta: {
          created_at: expectedNewDate,
          author: "alice",
        },
      }),
    }
    const mockConnection = {
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any

    const update = {
      table: "test_table",
      column: "meta",
      primaryKeys: [{ column: "_id", value: docId.toHexString() }],
      value: {
        created_at: newDateString,
        author: "alice",
      },
      oldValue: {
        created_at: "2023-01-15T12:00:00.000Z",
        author: "alice",
      },
    }

    await client.updateValues([update as any], mockConnection)

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1)
    const [, updateDoc] = mockCollection.findOneAndUpdate.mock.calls[0]
    expect(updateDoc.$set["meta.created_at"]).toBeInstanceOf(Date)
    expect(updateDoc.$set["meta.created_at"].getTime()).toBe(expectedNewDate.getTime())
  })

  it("updates top-level primitive columns directly with $set", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const docId = new ObjectId()

    const mockCollection = {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        _id: docId,
        name: "updated_name",
      }),
    }
    const mockConnection = {
      collection: vi.fn().mockReturnValue(mockCollection),
    } as any

    const update = {
      table: "test_table",
      column: "name",
      primaryKeys: [{ column: "_id", value: docId.toHexString() }],
      value: "updated_name",
      oldValue: "old_name",
    }

    await client.updateValues([update as any], mockConnection)

    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1)
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: docId },
      {
        $set: {
          name: "updated_name",
        },
      },
      { returnDocument: "after" }
    )
  })
})
