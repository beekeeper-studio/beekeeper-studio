import { ObjectId } from "mongodb";
import { UnknownTranscoder } from "@/lib/db/serialization/transcoders";

describe("UnknownTranscoder", () => {
  describe("serialize", () => {
    it.each([
      ["string", "hello"],
      ["number", 42],
      ["boolean", true],
      ["null", null],
      ["undefined", undefined],
      ["plain object", { a: 1, b: "two" }],
      ["array", [1, 2, 3]],
      ["Date", new Date()],
      ["Map", new Map([["k", "v"]])],
      ["Set", new Set([1])],
      ["RegExp", /x/],
      ["ArrayBuffer", new ArrayBuffer(4)],
      ["Uint8Array", new Uint8Array([1, 2])],
      ["Buffer", Buffer.from([1, 2, 3])],
      ["null-prototype object", Object.create(null)],
    ])("passes through IPC-safe value: %s", (_label, value) => {
      expect(UnknownTranscoder.serialize(value)).toBe(value);
    });

    it("throws on a class instance with no dedicated transcoder", () => {
      const oid = new ObjectId();
      expect(() => UnknownTranscoder.serialize(oid)).toThrow(/ObjectId/);
    });

    it("throws on a custom class instance", () => {
      class Custom {}
      expect(() => UnknownTranscoder.serialize(new Custom())).toThrow(/Custom/);
    });
  });

  describe("serializeCheckByField", () => {
    it("matches UNKNOWN fields", () => {
      expect(UnknownTranscoder.serializeCheckByField({ name: "x", bksType: "UNKNOWN" })).toBe(true);
    });

    it("does not match typed fields", () => {
      expect(UnknownTranscoder.serializeCheckByField({ name: "x", bksType: "BINARY" })).toBe(false);
      expect(UnknownTranscoder.serializeCheckByField({ name: "x", bksType: "OBJECTID" })).toBe(false);
      expect(UnknownTranscoder.serializeCheckByField({ name: "x", bksType: "SURREALID" })).toBe(false);
    });
  });

  describe("deserializeCheckByValue", () => {
    it("matches unsafe class instances", () => {
      class Custom {}
      expect(UnknownTranscoder.deserializeCheckByValue(new Custom())).toBe(true);
    });

    it("does not match safe values", () => {
      expect(UnknownTranscoder.deserializeCheckByValue("hi")).toBe(false);
      expect(UnknownTranscoder.deserializeCheckByValue(42)).toBe(false);
      expect(UnknownTranscoder.deserializeCheckByValue({ a: 1 })).toBe(false);
      expect(UnknownTranscoder.deserializeCheckByValue([1, 2])).toBe(false);
      expect(UnknownTranscoder.deserializeCheckByValue(new Date())).toBe(false);
      expect(UnknownTranscoder.deserializeCheckByValue(new Uint8Array([1]))).toBe(false);
    });
  });

  describe("deserialize", () => {
    it("throws when invoked", () => {
      class Custom {}
      expect(() => UnknownTranscoder.deserialize(new Custom())).toThrow(/Custom/);
    });
  });
});
