import { Mutators } from "../../../../src/lib/data/tools";


describe("Mutators", () => {
  describe("Error handling", () => {
    it("should not throw errors when mutation fails", () => {
      // Create circular reference object
      const circularObj = { a: 1 };
      circularObj.self = circularObj;

      // Test jsonMutator with problematic inputs
      expect(() => Mutators.jsonMutator(circularObj)).not.toThrow();

      // Test bit1Mutator with null/undefined
      expect(() => Mutators.bit1Mutator(null)).not.toThrow();
      expect(() => Mutators.bit1Mutator(undefined)).not.toThrow();

      // Test bitMutator with null input
      expect(() => Mutators.bitMutator('postgresql', null)).not.toThrow();

      // Test genericMutator with non-serializable types
      expect(() => Mutators.genericMutator(Symbol('test'))).not.toThrow();
      expect(() => Mutators.genericMutator(BigInt(123))).not.toThrow();
    });
  });

  describe("jsonMutator", () => {
    it("should return null as-is", () => {
      expect(Mutators.jsonMutator(null)).toBeNull();
    });

    it("should wrap string scalars in JSON.stringify so they display with outer quotes", () => {
      // A plain string scalar
      expect(Mutators.jsonMutator("hello")).toBe('"hello"');
    });

    it("should wrap a string scalar that looks like a JSON object in JSON.stringify", () => {
      // This is the core bug: node-postgres returns JSONB string scalars as JS strings.
      // A JSONB string scalar '{"hello":"world"}' must display as "{\"hello\":\"world\"}"
      // (with outer quotes), not as {"hello":"world"} (which looks like a real object).
      const value = '{"hello":"world"}';
      const result = Mutators.jsonMutator(value);
      expect(result).toBe(JSON.stringify(value));
      expect(result).not.toBe(value); // must differ from the raw string
    });

    it("should return JSONB objects via friendlyJsonObject (with custom toString)", () => {
      const result = Mutators.jsonMutator({ hello: "world" });
      // friendlyJsonObject returns the same object enhanced with toString() — not a plain string
      expect(typeof result).toBe("object");
      // The string coercion (used by table cells) must produce the JSON representation
      expect(JSON.parse(String(result))).toEqual({ hello: "world" });
    });

    it("should pass numbers and booleans through unchanged", () => {
      expect(Mutators.jsonMutator(42)).toBe(42);
      expect(Mutators.jsonMutator(true)).toBe(true);
    });
  });
});
