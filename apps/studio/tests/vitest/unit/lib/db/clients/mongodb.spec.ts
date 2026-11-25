import { describe, it, expect, vi } from "vitest";
import { BSON, Binary, Code, DBRef, Decimal128, Double, Int32, Long, MaxKey, MinKey, ObjectId, Timestamp, UUID } from "mongodb"
import { MongoDBClient, urlUsesGssapi } from "@commercial/backend/lib/db/clients/mongodb"
import { bsonValuesToPlain, restoreBsonTypes } from "@commercial/backend/lib/db/clients/mongodb/utils"
import { CsvExporter } from "@/lib/export/formats/csv"
import { JsonExporter } from "@/lib/export/formats/json"
import { Mutators } from "@/lib/data/tools"

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

describe("MongoDBClient streaming", () => {
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

describe("MongoDBClient ObjectIds", () => {
  const ID = "64a1b1c2e4b0a1b2c3d4e5f1"
  const FILM_ID = "64a1b1c2e4b0a1b2c3d4e5f2"
  const RELEASED = new Date("2006-01-01T00:00:00.000Z")

  function filmDoc() {
    return {
      _id: new ObjectId(ID),
      title: "ACADEMY DINOSAUR",
      actors: { films: [{ film_id: new ObjectId(FILM_ID) }] },
      tags: [new ObjectId(FILM_ID)],
      released: RELEASED,
    }
  }

  const expectedRow = [ID, "ACADEMY DINOSAUR", { films: [{ film_id: FILM_ID }] }, [FILM_ID], RELEASED]

  it("returns top-level and nested ObjectIds in query results as hex strings", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    client.queryLeaf = { execute: vi.fn().mockResolvedValue([filmDoc()]) } as any

    const [result] = await client.executeQuery("SELECT * FROM films")

    expect(result.rows).toEqual([{
      _id: ID,
      title: "ACADEMY DINOSAUR",
      actors: { films: [{ film_id: FILM_ID }] },
      tags: [FILM_ID],
      released: RELEASED,
    }])
  })

  it("streams ObjectIds as hex strings when exporting a query", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    client.queryLeaf = { executeCursor: async () => fakeCursor([filmDoc()]) } as any

    const { cursor } = await client.queryStream("SELECT * FROM films", 100)
    await cursor.start()

    expect(await cursor.read()).toEqual([expectedRow])
  })

  it("streams ObjectIds as hex strings when exporting a table", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    vi.spyOn(client as any, "buildSelectTopCursor").mockReturnValue(fakeCursor([filmDoc()]))
    vi.spyOn(client, "listTableColumns").mockResolvedValue(
      ["_id", "title", "actors", "tags", "released"].map((columnName) => ({ tableName: "films", columnName, dataType: "unknown" })) as any
    )

    const { cursor } = await client.selectTopStream("films", [], [], 100)
    await cursor.start()

    expect(await cursor.read()).toEqual([expectedRow])
  })

  it("writes ObjectIds as hex in CSV and JSON exports", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    client.queryLeaf = { executeCursor: async () => fakeCursor([filmDoc()]) } as any
    const { cursor } = await client.queryStream("SELECT * FROM films", 100)
    await cursor.start()
    const [row] = await cursor.read()
    const options = { chunkSize: 100, deleteOnAbort: false }
    const csv = new CsvExporter("films.csv", client, null, "SELECT * FROM films", "films", [], options, { header: true, delimiter: "," }, false)
    const json = new JsonExporter("films.json", client, null, "SELECT * FROM films", "films", [], options, { prettyprint: false }, false)

    // same steps Export.exportData runs on every row
    const csvLine = csv.formatRow(Mutators.mutateRow(row, [], csv.preserveComplex))
    const jsonRow = JSON.parse(json.formatRow(Mutators.mutateRow(row, [], json.preserveComplex)))

    expect(csvLine).toBe(
      `${ID},ACADEMY DINOSAUR,"{""films"":[{""film_id"":""${FILM_ID}""}]}","[""${FILM_ID}""]",2006-01-01T00:00:00.000Z`
    )
    expect(jsonRow).toEqual({
      col_1: ID,
      col_2: "ACADEMY DINOSAUR",
      col_3: { films: [{ film_id: FILM_ID }] },
      col_4: [FILM_ID],
      col_5: "2006-01-01T00:00:00.000Z",
    })
  })
})

describe("MongoDBClient other BSON types", () => {
  const ID = "64a1b1c2e4b0a1b2c3d4e5f1"
  const UUID_TEXT = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"

  // what the driver hands back with its default options: small Longs, Int32 and
  // Double become numbers, the rest stay class instances
  function readDoc() {
    return BSON.deserialize(BSON.serialize({
      _id: new ObjectId(ID),
      price: Decimal128.fromString("12.345"),
      views: Long.fromString("9007199254740993"),
      likes: Long.fromNumber(42),
      avatar: new Binary(Buffer.from([1, 2, 3])),
      uuid: new UUID(UUID_TEXT),
      updated: new Timestamp({ t: 1700000000, i: 1 }),
      owner: new DBRef("users", new ObjectId(ID)),
      low: new MinKey(),
      high: new MaxKey(),
      check: new Code("function () { return 1 }"),
      scoped: new Code("function () { return x }", { x: Decimal128.fromString("2") }),
      badUuid: new Binary(Buffer.from([1, 2, 3]), Binary.SUBTYPE_UUID),
      pattern: /a+b/i,
      ref: new DBRef("users", "u1" as any, "app", { note: Decimal128.fromString("3") }),
      history: [{ price: Decimal128.fromString("1.50") }],
    }))
  }

  const expected = {
    _id: ID,
    price: "12.345",
    views: "9007199254740993",
    likes: 42,
    avatar: "AQID",
    uuid: UUID_TEXT,
    updated: { t: 1700000000, i: 1 },
    owner: { $ref: "users", $id: ID },
    low: "MinKey",
    high: "MaxKey",
    check: "function () { return 1 }",
    scoped: { code: "function () { return x }", scope: { x: "2" } },
    badUuid: "AQID",
    pattern: "/a+b/i",
    ref: { $ref: "users", $id: "u1", $db: "app", note: "3" },
    history: [{ price: "1.50" }],
  }

  it("returns them as plain values in query results", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    client.queryLeaf = { execute: vi.fn().mockResolvedValue([readDoc()]) } as any

    const [result] = await client.executeQuery("SELECT * FROM posts")

    expect(result.rows).toEqual([expected])
  })

  it("writes them as plain values in CSV and JSON exports", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    client.queryLeaf = { executeCursor: async () => fakeCursor([readDoc()]) } as any
    const { cursor } = await client.queryStream("SELECT * FROM posts", 100)
    await cursor.start()
    const [row] = await cursor.read()
    const options = { chunkSize: 100, deleteOnAbort: false }
    const csv = new CsvExporter("posts.csv", client, null, "SELECT * FROM posts", "posts", [], options, { header: true, delimiter: "," }, false)
    const json = new JsonExporter("posts.json", client, null, "SELECT * FROM posts", "posts", [], options, { prettyprint: false }, false)

    const csvLine = csv.formatRow(Mutators.mutateRow(row, [], csv.preserveComplex))
    const jsonRow = JSON.parse(json.formatRow(Mutators.mutateRow(row, [], json.preserveComplex)))

    expect(csvLine).toContain(`${ID},12.345,9007199254740993,42,AQID,${UUID_TEXT},`)
    expect(Object.values(jsonRow)).toEqual(Object.values(expected))
  })
})

describe("MongoDBClient editing BSON types", () => {
  const ID = "64a1b1c2e4b0a1b2c3d4e5f1"
  const OTHER_ID = "64a1b1c2e4b0a1b2c3d4e5f2"
  const UUID_TEXT = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"

  // updateValues reads the stored value with promoteValues: false
  const stored = () => BSON.deserialize(BSON.serialize({
    _id: new ObjectId(ID),
    price: Decimal128.fromString("12.345"),
    views: Long.fromString("9007199254740993"),
    uuid: new UUID(UUID_TEXT),
    avatar: new Binary(Buffer.from([1, 2, 3, 4])),
    updated: new Timestamp({ t: 1700000000, i: 1 }),
    released: new Date("2006-01-01T00:00:00.000Z"),
    owner: new DBRef("users", new ObjectId(ID)),
    check: new Code("function () { return x }", { x: 1 }),
    meta: { author: new ObjectId(OTHER_ID), rating: Decimal128.fromString("4.5"), tags: ["a"] },
    counts: { n: Long.fromNumber(7), d: new Double(2), i: new Int32(3) },
    items: [{ sku: new ObjectId(ID), price: Decimal128.fromString("1.50") }],
    related: [new ObjectId(ID), new ObjectId(OTHER_ID)],
    grid: [[new ObjectId(ID)]],
    sparse: [new ObjectId(ID), null],
  }), { promoteValues: false })

  // what the cell editor sends back: text, with objects and arrays as JSON
  const asEdited = (value) => {
    const plain = bsonValuesToPlain(value)
    if (plain instanceof Date) return plain.toISOString()
    return typeof plain === "object" && plain !== null ? JSON.stringify(plain) : String(plain)
  }

  const bytes = (value) => Buffer.from(BSON.serialize({ value })).toString("hex")

  it("gives back the stored value when a cell is saved unchanged", () => {
    const doc = stored()
    for (const key of Object.keys(doc).filter((k) => k !== "_id")) {
      expect(restoreBsonTypes(asEdited(doc[key]), doc[key])).toBe(doc[key])
    }
    // Int32, Double and Long inside an object are written back as they were
    expect(bytes(restoreBsonTypes(asEdited(doc.counts), doc.counts))).toBe(bytes(doc.counts))
    // binaries can also come back as hex
    expect(restoreBsonTypes("01020304", doc.avatar)).toBe(doc.avatar)
    expect(restoreBsonTypes(UUID_TEXT.replace(/-/g, ""), doc.uuid)).toBe(doc.uuid)
  })

  it("reads edited text as the type it replaces", () => {
    const doc = stored()
    const restore = (key, value) => restoreBsonTypes(value, doc[key])

    expect(restore("price", "13.5")).toEqual(Decimal128.fromString("13.5"))
    expect(restore("views", "9007199254740995")).toEqual(Long.fromString("9007199254740995"))
    expect(restore("uuid", "00000000-0000-4000-8000-000000000001")).toEqual(new UUID("00000000-0000-4000-8000-000000000001"))
    expect(restore("updated", '{"t":1700000001,"i":2}')).toEqual(new Timestamp({ t: 1700000001, i: 2 }))
    expect(restore("released", "2007-02-03T00:00:00.000Z")).toEqual(new Date("2007-02-03T00:00:00.000Z"))
  })

  it("keeps the types inside an edited object or array", () => {
    const doc = stored()
    const meta = restoreBsonTypes(JSON.stringify({ author: OTHER_ID, rating: "5", tags: ["a", "b"], note: "new" }), doc.meta)
    expect(meta).toEqual({ author: new ObjectId(OTHER_ID), rating: Decimal128.fromString("5"), tags: ["a", "b"], note: "new" })

    const items = restoreBsonTypes(JSON.stringify([{ sku: ID, price: "2.00" }]), doc.items)
    expect(items).toEqual([{ sku: new ObjectId(ID), price: Decimal128.fromString("2.00") }])

    // a number where a Decimal128 was, and numbers of each width
    expect(restoreBsonTypes('{"author":"' + OTHER_ID + '","rating":5,"tags":["a"]}', doc.meta).rating).toEqual(Decimal128.fromString("5"))
    const counts = restoreBsonTypes('{"n":8,"d":2.5,"i":4}', doc.counts)
    expect(bytes(counts)).toBe(bytes({ n: Long.fromNumber(8), d: new Double(2.5), i: new Int32(4) }))

    expect(restoreBsonTypes(JSON.stringify([[OTHER_ID]]), doc.grid)).toEqual([[new ObjectId(OTHER_ID)]])
    expect(restoreBsonTypes(JSON.stringify([ID, OTHER_ID]), doc.sparse)).toEqual([new ObjectId(ID), new ObjectId(OTHER_ID)])

    // moved, kept and added elements
    const related = restoreBsonTypes(JSON.stringify([OTHER_ID, "64a1b1c2e4b0a1b2c3d4e5f3"]), doc.related)
    expect(related).toEqual([new ObjectId(OTHER_ID), new ObjectId("64a1b1c2e4b0a1b2c3d4e5f3")])
  })

  it.each([
    ["price", "abc", "Invalid Decimal128 value: abc"],
    ["views", "1.5", "Invalid Long value: 1.5"],
    ["uuid", "not-a-uuid", "Invalid Binary value: not-a-uuid"],
    ["avatar", "0102", "Binary values can't be edited as text"],
    ["released", "2006-02-30", "Invalid Date value: 2006-02-30"],
    ["updated", '{"t":"soon"}', "Invalid Timestamp value"],
    ["meta", "{not json", "Expected JSON for an object or array value"],
    ["meta", '{"author":{"x":1}}', 'Invalid ObjectId value: {"x":1}'],
    ["released", 0, "Invalid Date value: 0"],
    ["check", '{"cod":"x"}', "Invalid Code value"],
  ])("rejects %s set to %s instead of changing its type", (key, text, message) => {
    const doc = stored()
    expect(() => restoreBsonTypes(text, doc[key])).toThrow(message)
  })

  it("rejects values that lost their class on the way to the renderer", () => {
    const doc = stored()
    // what an ObjectId or Decimal128 looks like after a structured clone
    expect(() => restoreBsonTypes(structuredClone(doc.meta), doc.meta)).toThrow("Invalid ObjectId value")
  })

  it("sends table view values the same way as query results", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    vi.spyOn(client as any, "buildSelectTopCursor").mockReturnValue({ toArray: async () => [BSON.deserialize(BSON.serialize({
      _id: new ObjectId(ID),
      meta: { author: new ObjectId(OTHER_ID), rating: Decimal128.fromString("4.5") },
    }))] })

    const { result } = await client.selectTop("posts", 0, 100, [], [])

    expect(result[0].meta).toEqual({ author: OTHER_ID, rating: "4.5" })
    // the _id column still goes through MongoDBObjectIdTranscoder
    expect(result[0]._id).toEqual(new ObjectId(ID).id)
  })

  it("leaves values without a BSON type as they were", () => {
    expect(restoreBsonTypes("new", "old")).toBe("new")
    expect(restoreBsonTypes(5, 4)).toBe(5)
    expect(restoreBsonTypes("x", undefined)).toBe("x")
  })

  function fakeConnection() {
    const findOneAndUpdate = vi.fn().mockResolvedValue({ _id: new ObjectId(ID) })
    const connection = { collection: () => ({ findOne: vi.fn().mockResolvedValue(stored()), findOneAndUpdate }) }
    return { connection, findOneAndUpdate }
  }

  it("saves a query result edit with the stored type", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const { connection, findOneAndUpdate } = fakeConnection()

    await client.updateValues([
      { table: "posts", column: "price", value: "13.5", primaryKeys: [{ column: "_id", value: ID }] },
    ] as any, connection as any)

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new ObjectId(ID) },
      { $set: { price: Decimal128.fromString("13.5") } },
      { returnDocument: "after" },
    )
  })

  it("writes nothing when one of the edits is invalid", async () => {
    const client = new MongoDBClient(null, { database: "test" } as any)
    const { connection, findOneAndUpdate } = fakeConnection()

    await expect(client.updateValues([
      { table: "posts", column: "price", value: "13.5", primaryKeys: [{ column: "_id", value: ID }] },
      { table: "posts", column: "views", value: "lots", primaryKeys: [{ column: "_id", value: ID }] },
    ] as any, connection as any)).rejects.toThrow("Invalid Long value: lots")
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })
})
