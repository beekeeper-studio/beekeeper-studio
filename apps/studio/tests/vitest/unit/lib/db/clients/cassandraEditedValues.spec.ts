import { describe, it, expect } from "vitest";
import * as cassandra from "cassandra-driver"
import { parseEditedValue, parseInsertedValue, parseKeyValue } from "@commercial/backend/lib/db/clients/cassandra/editedValues"
import { convertValueByType } from "@commercial/backend/lib/db/clients/cassandra/valueConverter"
import { CassandraData } from "@shared/lib/dialects/cassandra"
import { isEditableColumnType } from "@shared/lib/dialects/models"

const { BigDecimal, Duration, Integer, LocalDate, LocalTime, Long, TimeUuid, Uuid, dataTypes } = cassandra.types

// What gets written for a decimal: the unscaled value and the scale.
// BigDecimal#toNumber() can't be used, it ignores a negative scale.
const decimalParts = (value) => {
  const buffer = BigDecimal.toBuffer(value)
  return [Integer.fromBuffer(buffer.subarray(4)).toString(), buffer.readInt32BE(0)]
}

const invalid = (value, type) => () => parseEditedValue(value, type)

describe("cassandra edited values", () => {
  it("makes only the listed column types editable in the table view", () => {
    expect(isEditableColumnType(CassandraData, "decimal")).toBe(true)
    expect(isEditableColumnType(CassandraData, "list<int>")).toBe(false)
    expect(isEditableColumnType(CassandraData, "counter")).toBe(false)
    // dialects without a list are unchanged
    expect(isEditableColumnType({ sqlLabel: "SQL" }, "anything")).toBe(true)
  })

  it.each(["list<int>", "set<text>", "map<text, int>", "frozen<tuple<int, text>>", "frozen<address>", "counter"])(
    "doesn't let a %s column be edited",
    (type) => {
      expect(invalid("1", type)).toThrow(`Editing ${type} columns is not supported`)
    }
  )

  it("passes nulls through for any type", () => {
    expect(parseEditedValue(null, "int")).toBe(null)
    expect(parseEditedValue(undefined, "list<int>")).toBe(undefined)
  })

  it("keeps text as typed", () => {
    expect(parseEditedValue("", "text")).toBe("")
    expect(parseEditedValue(" 1.5 ", "varchar")).toBe(" 1.5 ")
    expect(parseEditedValue("plain", "ascii")).toBe("plain")
    expect(invalid("café", "ascii")).toThrow("Invalid ascii value: café")
  })

  it("treats an emptied cell as null for other types", () => {
    expect(parseEditedValue("", "int")).toBe(null)
    expect(parseEditedValue("  ", "decimal")).toBe(null)
  })

  describe("integers", () => {
    it.each([
      ["tinyint", "-128", "127", "128"],
      ["smallint", "-32768", "32767", "32768"],
      ["int", "-2147483648", "2147483647", "2147483648"],
    ])("checks the range of %s", (type, min, max, over) => {
      expect(parseEditedValue(min, type)).toBe(Number(min))
      expect(parseEditedValue(max, type)).toBe(Number(max))
      expect(invalid(over, type)).toThrow(`Invalid ${type} value: ${over}`)
    })

    it("keeps every digit of a bigint", () => {
      const value = parseEditedValue("9223372036854775807", "bigint")
      expect(value).toBeInstanceOf(Long)
      expect(String(value)).toBe("9223372036854775807")
      // the driver would wrap this round to 7766279631452241919
      expect(invalid("99999999999999999999", "bigint")).toThrow("Invalid bigint value: 99999999999999999999")
    })

    it("accepts any size of varint", () => {
      expect(String(parseEditedValue("-123456789012345678901234567890", "varint")))
        .toBe("-123456789012345678901234567890")
    })

    it.each(["tinyint", "smallint", "int", "bigint", "varint"])("rejects a %s that isn't a whole number", (type) => {
      // the driver would store 1 and 0
      expect(invalid("1.5", type)).toThrow(`Invalid ${type} value: 1.5`)
      expect(invalid("abc", type)).toThrow(`Invalid ${type} value: abc`)
    })

    it("accepts numbers as well as text", () => {
      expect(parseEditedValue(7, "int")).toBe(7)
    })
  })

  describe("floating point", () => {
    it.each(["float", "double"])("parses a %s", (type) => {
      expect(parseEditedValue("1.5", type)).toBe(1.5)
      expect(parseEditedValue("-2e3", type)).toBe(-2000)
      expect(parseEditedValue(3.25, type)).toBe(3.25)
      expect(parseEditedValue("NaN", type)).toBeNaN()
      expect(parseEditedValue("-Infinity", type)).toBe(-Infinity)
      expect(invalid("abc", type)).toThrow(`Invalid ${type} value: abc`)
    })

    it("rejects a float that would overflow", () => {
      expect(invalid("1e39", "float")).toThrow("Invalid float value: 1e39")
      expect(parseEditedValue("1e39", "double")).toBe(1e39)
    })
  })

  describe("decimal", () => {
    it("keeps the exponent of a value in scientific notation", () => {
      // BigDecimal.fromString() would store this as -0.00150
      expect(decimalParts(parseEditedValue("-1.50E+4", "decimal"))).toEqual(["-150", -2])
    })

    it.each([
      ["12.5", ["125", 1]],
      ["-0.00150", ["-150", 5]],
      ["1e3", ["1", -3]],
      ["+5", ["5", 0]],
      [".5", ["5", 1]],
      ["2.5E-3", ["25", 4]],
      [" 7 ", ["7", 0]],
    ])("parses %s", (text, expected) => {
      expect(decimalParts(parseEditedValue(text, "decimal"))).toEqual(expected)
    })

    it("reads back the same as it was shown", () => {
      for (const text of ["-1.50E+4", "12.50", "-0.00150", "123456789012345678901234567890.123"]) {
        expect(convertValueByType(parseEditedValue(text, "decimal"), { code: dataTypes.decimal })).toBe(text)
      }
    })

    it.each(["abc", "1.2.3", "1,5", "12abc", "NaN", "1e99999999999"])("rejects %s", (text) => {
      // the driver would store 0, 0.012, 1, 12, 0
      expect(invalid(text, "decimal")).toThrow(`Invalid decimal value: ${text}`)
    })
  })

  describe("duration", () => {
    const shown = (text) => convertValueByType(parseEditedValue(text, "duration"), { code: dataTypes.duration })

    it.each(["1y6mo2d", "-2d3h", "1h30m", "5s6ms7us8ns"])("round trips %s", (text) => {
      expect(parseEditedValue(text, "duration")).toBeInstanceOf(Duration)
      expect(shown(text)).toBe(text)
    })

    it("accepts the other formats Cassandra does", () => {
      expect(shown("1H30M")).toBe("1h30m")
      expect(shown("PT1H30M")).toBe("1h30m")
      expect(shown("P2W")).toBe("14d")
      expect(shown("P0001-02-03T04:05:06")).toBe("1y2mo3d4h5m6s")
    })

    it.each(["abc", "1x", "p1d"])("rejects %s", (text) => {
      // Duration.fromString() would turn these into an empty duration
      expect(invalid(text, "duration")).toThrow(`Invalid duration value: ${text}`)
    })
  })

  it("only takes true or false for a boolean", () => {
    expect(parseEditedValue("false", "boolean")).toBe(false)
    expect(parseEditedValue("TRUE", "boolean")).toBe(true)
    expect(parseEditedValue(false, "boolean")).toBe(false)
    // the driver stores any non empty text as true
    expect(invalid("no", "boolean")).toThrow("Invalid boolean value: no")
  })

  describe("dates and times", () => {
    it("parses a timestamp", () => {
      expect(parseEditedValue("2026-08-28T10:11:12.000Z", "timestamp")).toEqual(new Date("2026-08-28T10:11:12.000Z"))
      expect(parseEditedValue("2026-08-28", "timestamp")).toEqual(new Date("2026-08-28"))
      const date = new Date()
      expect(parseEditedValue(date, "timestamp")).toBe(date)
      // new Date("1.5") is 5 January 2001
      expect(invalid("1.5", "timestamp")).toThrow("Invalid timestamp value: 1.5")
      expect(invalid("2026-02-30", "timestamp")).toThrow("Invalid timestamp value: 2026-02-30")
    })

    it("parses a date", () => {
      expect(parseEditedValue("2026-08-28", "date")).toEqual(LocalDate.fromString("2026-08-28"))
      // LocalDate.fromString() would give 2026-03-02
      expect(invalid("2026-02-30", "date")).toThrow("Invalid date value: 2026-02-30")
      expect(invalid("28/08/2026", "date")).toThrow("Invalid date value: 28/08/2026")
    })

    it("parses a time", () => {
      expect(parseEditedValue("10:11:12.123456789", "time")).toEqual(LocalTime.fromString("10:11:12.123456789"))
      expect(parseEditedValue("10:11", "time")).toEqual(LocalTime.fromString("10:11"))
      // LocalTime.fromString() would give 00:00:00
      expect(invalid("abc", "time")).toThrow("Invalid time value: abc")
      expect(invalid("24:00:00", "time")).toThrow("Invalid time value: 24:00:00")
    })
  })

  describe("ids", () => {
    const uuid = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"
    const timeuuid = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

    it("parses a uuid and a timeuuid", () => {
      expect(parseEditedValue(uuid, "uuid")).toEqual(Uuid.fromString(uuid))
      expect(parseEditedValue(timeuuid, "timeuuid")).toEqual(TimeUuid.fromString(timeuuid))
      expect(invalid("abc", "uuid")).toThrow("Invalid uuid value: abc")
      expect(invalid(uuid, "timeuuid")).toThrow(`Invalid timeuuid value: ${uuid}`)
    })

    it("parses an inet", () => {
      expect(parseEditedValue("10.0.0.1", "inet")).toBe("10.0.0.1")
      expect(parseEditedValue("::1", "inet")).toBe("::1")
      expect(invalid("10.0.0.300", "inet")).toThrow("Invalid inet value: 10.0.0.300")
    })
  })

  it("takes a blob as bytes or hex", () => {
    expect(parseEditedValue(new Uint8Array([0xca, 0xfe]), "blob")).toEqual(Buffer.from([0xca, 0xfe]))
    expect(parseEditedValue("0xCAFE", "blob")).toEqual(Buffer.from([0xca, 0xfe]))
    expect(invalid("cafe", "blob")).toThrow("Invalid blob value: cafe")
  })

  it("copies collections of a cloned row as they were read, but not text", () => {
    const list = [1, 2]
    const map = { a: "1" }
    expect(parseInsertedValue(list, "list<int>")).toBe(list)
    expect(parseInsertedValue(map, "map<text, text>")).toBe(map)
    // the driver would store {"0":"a","1":"b"}
    expect(() => parseInsertedValue("ab", "map<text, text>")).toThrow("Editing map<text, text> columns is not supported")
    expect(() => parseInsertedValue("1.5", "int")).toThrow("Invalid int value: 1.5")
  })

  it("checks numbers the same way as text", () => {
    expect(invalid(1.5, "varint")).toThrow("Invalid varint value: 1.5")
    expect(invalid(NaN, "int")).toThrow("Invalid int value: NaN")
  })

  it("passes key values of types that can't be edited through", () => {
    const key = ["a", "b"]
    expect(parseKeyValue(key, "frozen<list<text>>")).toBe(key)
    expect(parseKeyValue("7", "int")).toBe(7)
  })
})
