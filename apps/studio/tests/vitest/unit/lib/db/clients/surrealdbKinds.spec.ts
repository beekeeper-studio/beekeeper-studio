import { describe, it, expect } from "vitest";
import { DateTime, Decimal, Duration, GeometryPoint, RecordId, Uuid } from "surrealdb";
import { kindToBksType, valueToKind } from "@commercial/backend/lib/db/clients/surrealdb/utils";

describe("SurrealDB kind parsing", () => {
  describe("kindToBksType", () => {
    it.each([
      ["record", "SURREALID"],
      ["string", "STRING"],
      ["number", "NUMBER"],
      ["int", "INTEGER"],
      ["float", "FLOAT"],
      ["decimal", "DECIMAL"],
      ["bool", "BOOLEAN"],
      ["datetime", "DATETIME"],
      ["duration", "DURATION"],
      ["uuid", "UUID"],
      ["object", "OBJECT"],
      ["array", "ARRAY"],
      ["set", "ARRAY"],
      ["geometry", "GEOMETRY"],
    ])("maps %s to %s", (kind, expected) => {
      expect(kindToBksType(kind)).toBe(expected);
    });

    it("ignores generic args", () => {
      expect(kindToBksType("record<user>")).toBe("SURREALID");
      expect(kindToBksType("record<user | admin>")).toBe("SURREALID");
      expect(kindToBksType("array<string>")).toBe("ARRAY");
      expect(kindToBksType("array<record<user>, 10>")).toBe("ARRAY");
      expect(kindToBksType("set<int, 10>")).toBe("ARRAY");
      expect(kindToBksType("geometry<point>")).toBe("GEOMETRY");
    });

    it("unwraps option<>", () => {
      expect(kindToBksType("option<string>")).toBe("STRING");
      expect(kindToBksType("option<record<user>>")).toBe("SURREALID");
      expect(kindToBksType("option<array<int>>")).toBe("ARRAY");
    });

    it("drops none from unions", () => {
      expect(kindToBksType("int | none")).toBe("INTEGER");
      expect(kindToBksType("none | int")).toBe("INTEGER");
      expect(kindToBksType("int|none")).toBe("INTEGER");
      expect(kindToBksType("none | int | none")).toBe("INTEGER");
      expect(kindToBksType("record<user> | none")).toBe("SURREALID");
      expect(kindToBksType("none | record<user>")).toBe("SURREALID");
      expect(kindToBksType("option<int | none>")).toBe("INTEGER");
    });

    it("trims surrounding whitespace", () => {
      expect(kindToBksType("  string  ")).toBe("STRING");
      expect(kindToBksType(" option<bool> ")).toBe("BOOLEAN");
    });

    it("returns UNKNOWN for unions of real types", () => {
      expect(kindToBksType("int | float")).toBe("UNKNOWN");
      expect(kindToBksType("string | record<user>")).toBe("UNKNOWN");
      expect(kindToBksType("option<int | string>")).toBe("UNKNOWN");
    });

    it("returns UNKNOWN for unrecognised or empty kinds", () => {
      expect(kindToBksType("any")).toBe("UNKNOWN");
      expect(kindToBksType("none")).toBe("UNKNOWN");
      expect(kindToBksType("bytes")).toBe("UNKNOWN");
      expect(kindToBksType("")).toBe("UNKNOWN");
      expect(kindToBksType(undefined)).toBe("UNKNOWN");
      expect(kindToBksType(null)).toBe("UNKNOWN");
    });
  });

  describe("valueToKind", () => {
    it("returns null for NONE / NULL", () => {
      expect(valueToKind(undefined, "person")).toBeNull();
      expect(valueToKind(null, "person")).toBeNull();
    });

    it("treats a record id on its own table as a string", () => {
      expect(valueToKind(new RecordId("person", "tobie"), "person")).toBe("string");
    });

    it("treats a record id on another table as a record link", () => {
      expect(valueToKind(new RecordId("address", 1), "person")).toBe("record<address>");
    });

    it("maps SurrealDB value classes", () => {
      expect(valueToKind(new Decimal("19.99"), "t")).toBe("decimal");
      expect(valueToKind(new DateTime("2026-11-02T11:28:37Z"), "t")).toBe("datetime");
      expect(valueToKind(new Date(), "t")).toBe("datetime");
      expect(valueToKind(new Duration("1h30m"), "t")).toBe("duration");
      expect(valueToKind(new Uuid("0193b5ad-1c3f-7c5e-9a77-6c2f1d0e8a10"), "t")).toBe("uuid");
      expect(valueToKind(new GeometryPoint([53.38, -2.35]), "t")).toBe("geometry");
    });

    it("maps JS primitives", () => {
      expect(valueToKind("alpha", "t")).toBe("string");
      expect(valueToKind("", "t")).toBe("string");
      expect(valueToKind(true, "t")).toBe("bool");
      expect(valueToKind(false, "t")).toBe("bool");
    });

    it("keeps numbers general since a sample can't tell int from float", () => {
      expect(valueToKind(1, "t")).toBe("number");
      expect(valueToKind(1.5, "t")).toBe("number");
      expect(valueToKind(0, "t")).toBe("number");
      expect(valueToKind(BigInt(10), "t")).toBe("number");
    });

    it("maps collections", () => {
      expect(valueToKind([1, 2], "t")).toBe("array");
      expect(valueToKind([], "t")).toBe("array");
      expect(valueToKind(new Set([1]), "t")).toBe("set");
      expect(valueToKind({ a: 1 }, "t")).toBe("object");
      expect(valueToKind({}, "t")).toBe("object");
    });

    it("falls back to any for anything else", () => {
      expect(valueToKind(new Map(), "t")).toBe("any");
      expect(valueToKind(() => undefined, "t")).toBe("any");
    });

    it("produces kinds that kindToBksType understands", () => {
      expect(kindToBksType(valueToKind(new RecordId("address", 1), "person"))).toBe("SURREALID");
      expect(kindToBksType(valueToKind(new RecordId("person", 1), "person"))).toBe("STRING");
      expect(kindToBksType(valueToKind(new Set([1]), "t"))).toBe("ARRAY");
      expect(kindToBksType(valueToKind(1, "t"))).toBe("NUMBER");
    });
  });
});
