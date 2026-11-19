import { describe, it, expect } from "vitest";
import * as cassandra from "cassandra-driver"
import {
  CassandraDecimalTranscoder,
  CassandraDurationTranscoder,
  columnTypeToBksType,
} from "@commercial/backend/lib/db/clients/cassandra/transcoders"
import { decimalToString, durationToString } from "@commercial/backend/lib/db/clients/cassandra/valueConverter"
import { BksField } from "@/lib/db/models"

const { BigDecimal, Duration } = cassandra.types

// What gets written to Cassandra: the unscaled value and the scale.
// BigDecimal#toNumber() can't be used, it ignores a negative scale.
const parts = (value) => {
  const buffer = BigDecimal.toBuffer(value)
  return [cassandra.types.Integer.fromBuffer(buffer.subarray(4)).toString(), buffer.readInt32BE(0)]
}

const decimalField: BksField = { name: "amount", bksType: "DECIMAL" }
const durationField: BksField = { name: "dur", bksType: "DURATION" }

describe("cassandra transcoders", () => {
  describe("decimal", () => {
    const transcoder = CassandraDecimalTranscoder

    it("keeps the exponent of a value in scientific notation", () => {
      // BigDecimal.fromString() would store this as -0.00150
      const value = transcoder.deserialize("-1.50E+4")
      expect(value).toBeInstanceOf(BigDecimal)
      expect(parts(value)).toEqual(["-150", -2])
      expect(decimalToString(value)).toBe("-1.50E+4")
    })

    it.each(["12.5", "-0.00150", "0", "123456789012345678901234567890.123"])("round trips %s", (text) => {
      expect(decimalToString(transcoder.deserialize(text))).toBe(text)
    })

    it.each([
      ["1e3", ["1", -3]],
      ["+5", ["5", 0]],
      [".5", ["5", 1]],
      ["2.5E-3", ["25", 4]],
      [" 7 ", ["7", 0]],
    ])("parses %s", (text, expected) => {
      expect(parts(transcoder.deserialize(text))).toEqual(expected)
    })

    it.each(["abc", "1.2.3", "1,5", "12abc", "NaN", "1e99999999999"])("rejects %s", (text) => {
      // the driver would store 0, 0.012, 1, 12, 0 instead of failing
      expect(() => transcoder.deserialize(text)).toThrow(`Invalid decimal value: ${text}`)
    })

    it("leaves an empty cell alone", () => {
      expect(transcoder.deserialize("")).toBe("")
      expect(transcoder.deserialize("  ")).toBe("  ")
    })

    it("only applies to string values in decimal columns", () => {
      expect(transcoder.deserializeCheckByField(decimalField, "1.5")).toBe(true)
      expect(transcoder.deserializeCheckByField(decimalField, null)).toBe(false)
      expect(transcoder.deserializeCheckByField(durationField, "1.5")).toBe(false)
      expect(transcoder.deserializeCheckByValue("1.5")).toBe(false)
    })
  })

  describe("duration", () => {
    const transcoder = CassandraDurationTranscoder

    it.each(["1y6mo2d", "-2d3h", "1h30m", "5s6ms7us8ns"])("round trips %s", (text) => {
      const value = transcoder.deserialize(text)
      expect(value).toBeInstanceOf(Duration)
      expect(durationToString(value)).toBe(text)
    })

    it("accepts the ISO 8601 formats", () => {
      expect(durationToString(transcoder.deserialize("PT1H30M"))).toBe("1h30m")
      expect(durationToString(transcoder.deserialize("P2W"))).toBe("14d")
      expect(durationToString(transcoder.deserialize("P0001-02-03T04:05:06"))).toBe("1y2mo3d4h5m6s")
    })

    it("accepts units in any case, like Cassandra", () => {
      expect(durationToString(transcoder.deserialize("1H30M"))).toBe("1h30m")
      expect(durationToString(transcoder.deserialize("2D5MS"))).toBe("2d5ms")
    })

    it.each(["abc", "1x", "p1d"])("rejects %s", (text) => {
      // Duration.fromString() would turn these into an empty duration
      expect(() => transcoder.deserialize(text)).toThrow(`Invalid duration value: ${text}`)
    })

    it("only applies to string values in duration columns", () => {
      expect(transcoder.deserializeCheckByField(durationField, "1h")).toBe(true)
      expect(transcoder.deserializeCheckByField(decimalField, "1h")).toBe(false)
    })
  })

  it("picks the field type from the column type", () => {
    expect(columnTypeToBksType("decimal")).toBe("DECIMAL")
    expect(columnTypeToBksType("duration")).toBe("DURATION")
    expect(columnTypeToBksType("list<decimal>")).toBe("UNKNOWN")
    expect(columnTypeToBksType("blob")).toBe("BINARY")
  })
})
