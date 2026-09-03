import * as cassandra from "cassandra-driver"
import { convertValueByType, dataTypeName, toDriverValue } from "@commercial/backend/lib/db/clients/cassandra/valueConverter"

const dataTypes = cassandra.types.dataTypes

const uuid = (code = dataTypes.uuid) => ({ code })
const text = { code: dataTypes.text }
const int = { code: dataTypes.int }
const boolean = { code: dataTypes.boolean }

const list = (info) => ({ code: dataTypes.list, info })
const set = (info) => ({ code: dataTypes.set, info })
const map = (keyType, valueType) => ({ code: dataTypes.map, info: [keyType, valueType] })
const tuple = (...info) => ({ code: dataTypes.tuple, info })
const udt = (name, fields) => ({
  code: dataTypes.udt,
  info: {
    name,
    keyspace: "mtm",
    fields: Object.entries(fields).map(([fieldName, type]) => ({ name: fieldName, type })),
  },
})

// The driver hands back Uuid instances. Once they cross the process boundary
// they arrive as their raw internals, which is what the grid used to render.
const driverUuid = (value: string) => cassandra.types.Uuid.fromString(value)

const ID_A = "b7e4e35c-1a05-4c93-8a3f-9d2fd6a1f001"
const ID_B = "0f2b6c1e-9d4a-4e21-8b70-3c1a5e7d2002"

describe("cassandra valueConverter", () => {
  describe("scalars", () => {
    it("converts a top level uuid to a string", () => {
      expect(convertValueByType(driverUuid(ID_A), uuid())).toBe(ID_A)
    })

    it("converts a timeuuid to a string", () => {
      const value = cassandra.types.TimeUuid.now()
      expect(convertValueByType(value, uuid(dataTypes.timeuuid))).toBe(value.toString())
    })

    it("converts a bigint to a string", () => {
      expect(convertValueByType(cassandra.types.Long.fromString("9007199254740993"), { code: dataTypes.bigint }))
        .toBe("9007199254740993")
    })

    it("converts a counter to a string", () => {
      // a counter decodes to a Long, same as a bigint, but under its own code
      const value = cassandra.types.Long.fromString("9007199254740993")
      expect(convertValueByType(value, { code: dataTypes.counter })).toBe("9007199254740993")
    })

    it("converts a varint to a string", () => {
      // Integer is backed by an int array, so it has no meaningful raw form
      const value = cassandra.types.Integer.fromString("123456789012345678901234567890")
      expect(convertValueByType(value, { code: dataTypes.varint }))
        .toBe("123456789012345678901234567890")
    })

    it("converts a negative varint to a string", () => {
      const value = cassandra.types.Integer.fromString("-123456789012345678901234567890")
      expect(convertValueByType(value, { code: dataTypes.varint }))
        .toBe("-123456789012345678901234567890")
    })

    it("converts a decimal to a string, keeping its scale", () => {
      const value = cassandra.types.BigDecimal.fromString("1234.5678")
      expect(convertValueByType(value, { code: dataTypes.decimal })).toBe("1234.5678")
    })

    it("converts a decimal with more precision than a double can hold", () => {
      const value = cassandra.types.BigDecimal.fromString("0.10000000000000000001")
      expect(convertValueByType(value, { code: dataTypes.decimal })).toBe("0.10000000000000000001")
    })

    it("converts a duration to its CQL literal", () => {
      const value = new cassandra.types.Duration(1, 2, cassandra.types.Long.fromNumber(3000000000))
      expect(convertValueByType(value, { code: dataTypes.duration })).toBe("1mo2d3s")
    })

    it("spells out a zero duration rather than rendering a blank cell", () => {
      // Duration.toString() appends nothing per zero component, so an all-zero
      // duration stringifies to "" and is indistinguishable from unset
      const value = new cassandra.types.Duration(0, 0, cassandra.types.Long.ZERO)
      expect(String(value)).toBe("")
      expect(convertValueByType(value, { code: dataTypes.duration })).toBe("0s")
      // and it has to be something Cassandra reads back
      expect(String(cassandra.types.Duration.fromString("0s"))).toBe("")
    })

    it("does not apply the zero duration fallback to other numeric types", () => {
      // guards the switch fallthrough: a zero varint/decimal/bigint is "0"
      expect(convertValueByType(cassandra.types.Integer.fromString("0"), { code: dataTypes.varint })).toBe("0")
      expect(convertValueByType(cassandra.types.BigDecimal.fromString("0"), { code: dataTypes.decimal })).toBe("0")
      expect(convertValueByType(cassandra.types.Long.ZERO, { code: dataTypes.bigint })).toBe("0")
      expect(convertValueByType(cassandra.types.Long.ZERO, { code: dataTypes.counter })).toBe("0")
    })

    it("converts a timestamp to an ISO string", () => {
      const date = new Date("2026-08-28T10:11:12.000Z")
      expect(convertValueByType(date, { code: dataTypes.timestamp })).toBe("2026-08-28T10:11:12.000Z")
    })

    it("leaves plain types alone", () => {
      expect(convertValueByType("hello", text)).toBe("hello")
      expect(convertValueByType(7, int)).toBe(7)
      expect(convertValueByType(false, boolean)).toBe(false)
    })

    it("returns null for null and undefined", () => {
      expect(convertValueByType(null, uuid())).toBeNull()
      expect(convertValueByType(undefined, uuid())).toBeNull()
    })
  })

  describe("collections", () => {
    it("converts uuids in a list", () => {
      expect(convertValueByType([driverUuid(ID_A), driverUuid(ID_B)], list(uuid())))
        .toEqual([ID_A, ID_B])
    })

    it("converts uuids in a set", () => {
      expect(convertValueByType([driverUuid(ID_A), driverUuid(ID_B)], set(uuid())))
        .toEqual([ID_A, ID_B])
    })

    it("converts uuid keys and values in a map", () => {
      const value = { [ID_A]: driverUuid(ID_B) }
      expect(convertValueByType(value, map(uuid(), uuid()))).toEqual({ [ID_A]: ID_B })
    })

    it("converts a map decoded as an ES6 Map", () => {
      const value = new Map([[ID_A, driverUuid(ID_B)]])
      expect(convertValueByType(value, map(uuid(), uuid()))).toEqual({ [ID_A]: ID_B })
    })

    it("converts values in a tuple position by position", () => {
      // A real driver Tuple, not a plain array: Tuple is not iterable and has no
      // indexed properties, so Array.from(tuple) silently yields [undefined, ...]
      const value = cassandra.types.Tuple.fromArray([driverUuid(ID_A), 3])
      expect(convertValueByType(value, tuple(uuid(), int))).toEqual([ID_A, 3])
    })

    it("converts a tuple nested inside a collection", () => {
      const value = [cassandra.types.Tuple.fromArray([driverUuid(ID_A), 1])]
      expect(convertValueByType(value, list(tuple(uuid(), int))))
        .toEqual([[ID_A, 1]])
    })

    it("does not stringify an already stringified timestamp map key", () => {
      // The driver builds plain object maps with `map[key] = value`, so a Date
      // key arrives as a string and must not be handed toISOString()
      const key = new Date("2026-08-28T10:11:12.000Z").toString()
      const value = { [key]: driverUuid(ID_A) }

      expect(convertValueByType(value, map({ code: dataTypes.timestamp }, uuid())))
        .toEqual({ [key]: ID_A })
    })
  })

  describe("user defined types", () => {
    // a udt with a uuid field: the shape at the heart of this bug
    const itemRef = udt("item_ref", { id: uuid(), position: int })

    it("converts a uuid inside a bare udt column", () => {
      const ownerRef = udt("owner_ref", { id: uuid(), name: text, description: text })
      const value = { id: driverUuid(ID_A), name: "Acme", description: null }

      expect(convertValueByType(value, ownerRef))
        .toEqual({ id: ID_A, name: "Acme", description: null })
    })

    it("converts uuids inside a set of udts", () => {
      const value = [
        { id: driverUuid(ID_A), position: 1 },
        { id: driverUuid(ID_B), position: 2 },
      ]

      expect(convertValueByType(value, set(itemRef))).toEqual([
        { id: ID_A, position: 1 },
        { id: ID_B, position: 2 },
      ])
    })

    it("converts uuids inside a list of udts", () => {
      const value = [{ id: driverUuid(ID_A), position: 1 }]
      expect(convertValueByType(value, list(itemRef))).toEqual([{ id: ID_A, position: 1 }])
    })

    it("converts a collection nested inside a udt", () => {
      const memberType = udt("member_type", { username: text, roles: set(text), blocked: boolean })
      const value = { username: "test_user", roles: ["admin", "editor"], blocked: false }

      expect(convertValueByType(value, memberType))
        .toEqual({ username: "test_user", roles: ["admin", "editor"], blocked: false })
    })

    it("converts a uuid in a udt nested inside a udt inside a list", () => {
      // a udt holding another udt, inside a list
      const meta = udt("note_meta_type", { authorId: uuid() })
      const comment = udt("note_type", { id: uuid(), meta })
      const value = [{ id: driverUuid(ID_A), meta: { authorId: driverUuid(ID_B) } }]

      expect(convertValueByType(value, list(comment)))
        .toEqual([{ id: ID_A, meta: { authorId: ID_B } }])
    })

    it("converts uuids in a map whose values are udts", () => {
      const value = { first: { id: driverUuid(ID_A), position: 1 } }
      expect(convertValueByType(value, map(text, itemRef)))
        .toEqual({ first: { id: ID_A, position: 1 } })
    })

    it("keeps null udt fields null", () => {
      expect(convertValueByType({ id: null, position: null }, itemRef))
        .toEqual({ id: null, position: null })
    })

    it("returns null for a null udt column", () => {
      expect(convertValueByType(null, itemRef)).toBeNull()
    })

    it("returns null for a null element inside a collection of udts", () => {
      expect(convertValueByType([null], list(itemRef))).toEqual([null])
    })
  })

  describe("custom types", () => {
    it("converts a vector to a plain array", () => {
      // Vector is a Proxy over its elements and throws on structured clone
      const value = new cassandra.types.Vector(new Float32Array([1, 2, 3]), "float")
      const type = {
        code: dataTypes.custom,
        customTypeName: "vector",
        info: [{ code: dataTypes.float }, 3],
      }

      const converted = convertValueByType(value, type)
      expect(converted).toEqual([1, 2, 3])
      expect(structuredClone(converted)).toEqual([1, 2, 3])
    })

    it("converts a duration sent as a custom type", () => {
      // how a real server sends duration: custom, not type code 21
      const value = new cassandra.types.Duration(1, 2, cassandra.types.Long.fromNumber(3000000000))
      const type = { code: dataTypes.custom, info: "org.apache.cassandra.db.marshal.DurationType" }

      expect(convertValueByType(value, type)).toBe("1mo2d3s")
      expect(convertValueByType(
        new cassandra.types.Duration(0, 0, cassandra.types.Long.ZERO), type
      )).toBe("0s")
    })

    it("leaves an undecodable custom value as a buffer", () => {
      const value = Buffer.from([1, 2, 3])
      expect(convertValueByType(value, { code: dataTypes.custom, info: "com.example.Whatever" }))
        .toBe(value)
    })
  })

  describe("dataTypeName", () => {
    it("names scalars", () => {
      expect(dataTypeName({ code: dataTypes.varint })).toBe("varint")
      expect(dataTypeName({ code: dataTypes.decimal })).toBe("decimal")
      expect(dataTypeName({ code: dataTypes.counter })).toBe("counter")
    })

    it("names duration, which the old code-indexed array reported as list", () => {
      expect(dataTypeName({ code: dataTypes.duration })).toBe("duration")
    })

    it("names a custom type after its Java class", () => {
      // a real server sends duration as a custom type, not as code 21
      expect(dataTypeName({
        code: dataTypes.custom,
        info: "org.apache.cassandra.db.marshal.DurationType",
      })).toBe("duration")
      expect(dataTypeName({
        code: dataTypes.custom,
        info: "org.apache.cassandra.db.marshal.PointType",
      })).toBe("point")
    })

    it("names a vector with its subtype and dimensions", () => {
      expect(dataTypeName({
        code: dataTypes.custom,
        customTypeName: "vector",
        info: [{ code: dataTypes.float }, 3],
      })).toBe("vector<float, 3>")
    })

    it("names collections with their subtypes", () => {
      expect(dataTypeName(list(uuid()))).toBe("list<uuid>")
      expect(dataTypeName(set(text))).toBe("set<text>")
      expect(dataTypeName(map(text, int))).toBe("map<text, int>")
      expect(dataTypeName(tuple(uuid(), int))).toBe("tuple<uuid, int>")
    })

    it("names a udt after the type itself", () => {
      expect(dataTypeName(udt("item_ref", { id: uuid(), position: int }))).toBe("item_ref")
    })

    it("falls back for a descriptor it cannot read", () => {
      expect(dataTypeName(undefined as any)).toBe("user-defined")
      expect(dataTypeName({ code: 9999 })).toBe("user-defined")
    })
  })

  it("does not leave driver internals anywhere in a nested value", () => {
    const itemRef = udt("item_ref", { id: uuid(), position: int })
    const converted = convertValueByType(
      [{ id: driverUuid(ID_A), position: 1 }],
      set(itemRef)
    )

    // The bug: an unconverted Uuid instance survives the structured clone the
    // IPC boundary performs and reaches the grid as { buffer: ... }.
    // (JSON.stringify would hide this - Uuid defines toJSON.)
    expect(structuredClone(converted)).toEqual([{ id: ID_A, position: 1 }])
  })

  it("converts every driver class type nested inside a udt", () => {
    // one udt holding each of the types that decode to a class instance
    const metrics = udt("metrics_type", {
      total: { code: dataTypes.bigint },
      hits: { code: dataTypes.counter },
      huge: { code: dataTypes.varint },
      amount: { code: dataTypes.decimal },
      window: { code: dataTypes.duration },
    })
    const value = {
      total: cassandra.types.Long.fromString("9007199254740993"),
      hits: cassandra.types.Long.fromString("42"),
      huge: cassandra.types.Integer.fromString("123456789012345678901234567890"),
      amount: cassandra.types.BigDecimal.fromString("1234.5678"),
      window: new cassandra.types.Duration(1, 2, cassandra.types.Long.fromNumber(3000000000)),
    }

    const expected = {
      total: "9007199254740993",
      hits: "42",
      huge: "123456789012345678901234567890",
      amount: "1234.5678",
      window: "1mo2d3s",
    }

    const converted = convertValueByType([value], list(metrics))
    expect(converted).toEqual([expected])
    expect(structuredClone(converted)).toEqual([expected])
  })
})

describe("cassandra toDriverValue", () => {
  // The encoder is stricter than the decoder, so assert against the encoder
  // itself rather than against a shape we assume it wants.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Encoder = require("cassandra-driver/lib/encoder")
  const encoder = new Encoder(4, {})
  const encodes = (value, type) => {
    expect(() => encoder.encode(toDriverValue(value, type), type)).not.toThrow()
  }

  const durationType = { code: dataTypes.duration }
  const customDuration = {
    code: dataTypes.custom,
    info: "org.apache.cassandra.db.marshal.DurationType",
  }
  const vectorType = {
    code: dataTypes.custom,
    customTypeName: "vector",
    info: [{ code: dataTypes.float }, 3],
  }

  it("rebuilds a duration from the string the grid holds", () => {
    const converted = toDriverValue("1mo2d3s", durationType)
    expect(converted).toBeInstanceOf(cassandra.types.Duration)
    expect(String(converted)).toBe("1mo2d3s")
    encodes("1mo2d3s", durationType)
  })

  it("rebuilds a duration sent as a custom type", () => {
    expect(toDriverValue("1mo2d3s", customDuration)).toBeInstanceOf(cassandra.types.Duration)
    encodes("1mo2d3s", customDuration)
  })

  it("round trips the zero duration the reader spells out as 0s", () => {
    const zero = new cassandra.types.Duration(0, 0, cassandra.types.Long.ZERO)
    const displayed = convertValueByType(zero, durationType)

    expect(displayed).toBe("0s")
    const back = toDriverValue(displayed, durationType)
    expect(back.months).toBe(0)
    expect(back.days).toBe(0)
    expect(String(back.nanoseconds)).toBe("0")
    encodes(displayed, durationType)
  })

  it("rebuilds a tuple, which the encoder will not take as a plain array", () => {
    const type = tuple(uuid(), int)
    const displayed = convertValueByType(cassandra.types.Tuple.fromArray([driverUuid(ID_A), 3]), type)

    expect(displayed).toEqual([ID_A, 3])
    expect(toDriverValue(displayed, type)).toBeInstanceOf(cassandra.types.Tuple)
    encodes(displayed, type)
  })

  it("rebuilds a vector, which the encoder will not take as a plain array", () => {
    const converted = toDriverValue([1, 2, 3], vectorType)
    expect(converted).toBeInstanceOf(cassandra.types.Vector)
    encodes([1, 2, 3], vectorType)
  })

  it("rebuilds durations nested in collections and udts", () => {
    const metrics = udt("metrics_type", { window: durationType, name: text })

    const inList = toDriverValue(["1mo2d3s"], list(durationType))
    expect(inList[0]).toBeInstanceOf(cassandra.types.Duration)
    encodes(["1mo2d3s"], list(durationType))

    const inUdt = toDriverValue({ window: "1mo2d3s", name: "x" }, metrics)
    expect(inUdt.window).toBeInstanceOf(cassandra.types.Duration)
    expect(inUdt.name).toBe("x")
    encodes({ window: "1mo2d3s", name: "x" }, metrics)

    const inMap = toDriverValue({ first: "1mo2d3s" }, map(text, durationType))
    expect(inMap.first).toBeInstanceOf(cassandra.types.Duration)
    encodes({ first: "1mo2d3s" }, map(text, durationType))
  })

  it("passes through the types the encoder already accepts as strings", () => {
    // these were never broken and must not be touched
    expect(toDriverValue("123456789012345678901234567890", { code: dataTypes.varint }))
      .toBe("123456789012345678901234567890")
    expect(toDriverValue("1234.5678", { code: dataTypes.decimal })).toBe("1234.5678")
    expect(toDriverValue("9007199254740993", { code: dataTypes.bigint })).toBe("9007199254740993")
    expect(toDriverValue(ID_A, uuid())).toBe(ID_A)
    expect(toDriverValue("hello", text)).toBe("hello")
    expect(toDriverValue(7, int)).toBe(7)
    expect(toDriverValue(false, boolean)).toBe(false)

    encodes("123456789012345678901234567890", { code: dataTypes.varint })
    encodes("1234.5678", { code: dataTypes.decimal })
    encodes(ID_A, uuid())
  })

  it("leaves a blob buffer alone", () => {
    const value = Buffer.from([1, 2, 3])
    expect(toDriverValue(value, { code: dataTypes.blob })).toBe(value)
  })

  it("returns null for null, and for a null element inside a collection", () => {
    expect(toDriverValue(null, durationType)).toBeNull()
    expect(toDriverValue(undefined, durationType)).toBeNull()
    expect(toDriverValue([null], list(durationType))).toEqual([null])
  })

  it("passes a value through when the column type is unknown", () => {
    // metadata lookup can fail; the write should still go out as it used to
    expect(toDriverValue("1mo2d3s", undefined as any)).toBe("1mo2d3s")
  })

  it("accepts a value that is already a driver instance", () => {
    const d = cassandra.types.Duration.fromString("1mo2d3s")
    expect(toDriverValue(d, durationType)).toBe(d)

    const t = cassandra.types.Tuple.fromArray([ID_A, 3])
    expect(toDriverValue(t, tuple(uuid(), int))).toBe(t)
  })
})
