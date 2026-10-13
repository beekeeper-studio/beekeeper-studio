import { Decimal128 } from "mongodb";
import {
  MongoDBDecimal128Transcoder,
} from "@/lib/db/serialization/transcoders";
import { BksField } from "@/lib/db/models";

const field = (bksType: BksField["bksType"]): BksField => ({
  name: "value",
  bksType,
});

describe("MongoDBDecimal128Transcoder", () => {
  describe("serialize", () => {
    it("renders a Decimal128 as its readable decimal string", () => {
      expect(MongoDBDecimal128Transcoder.serialize(Decimal128.fromString("12.34"))).toBe(
        "12.34"
      );
    });

    it("preserves precision for high-precision values", () => {
      const raw = "0.0000000000000000001";
      expect(MongoDBDecimal128Transcoder.serialize(Decimal128.fromString(raw))).toBe(raw);
    });

    it("preserves precision for large-magnitude values", () => {
      const raw = "123456789012345678901234567890";
      expect(MongoDBDecimal128Transcoder.serialize(Decimal128.fromString(raw))).toBe(raw);
    });

    it("returns a non-Decimal128 value unchanged", () => {
      const value = { bytes: { 0: 176 } } as unknown as Decimal128;
      expect(MongoDBDecimal128Transcoder.serialize(value)).toBe(value);
    });
  });

  describe("serializeCheckByField", () => {
    it("matches DECIMAL fields", () => {
      expect(MongoDBDecimal128Transcoder.serializeCheckByField(field("DECIMAL"))).toBe(true);
    });

    it("ignores non-DECIMAL fields", () => {
      expect(MongoDBDecimal128Transcoder.serializeCheckByField(field("UNKNOWN"))).toBe(false);
      expect(MongoDBDecimal128Transcoder.serializeCheckByField(field("OBJECTID"))).toBe(false);
    });
  });

  describe("deserialize", () => {
    it("parses a decimal string back into an equal Decimal128", () => {
      const result = MongoDBDecimal128Transcoder.deserialize("12.34");
      expect(result).toBeInstanceOf(Decimal128);
      expect(result.toString()).toBe(Decimal128.fromString("12.34").toString());
    });

    it("returns a non-string value unchanged", () => {
      const value = 42 as unknown as string;
      expect(MongoDBDecimal128Transcoder.deserialize(value)).toBe(value);
    });
  });

  describe("deserializeCheckByValue", () => {
    it("never claims a value (display-only; write-back left untouched)", () => {
      expect(MongoDBDecimal128Transcoder.deserializeCheckByValue("12.34")).toBe(false);
      expect(MongoDBDecimal128Transcoder.deserializeCheckByValue("any string")).toBe(false);
    });
  });
});
