import { Mutators } from "../../../../src/lib/data/tools";


describe("Mutators", () => {
  describe("Error handling", () => {
    it("should not throw errors when mutation fails", () => {
      // Create circular reference object
      const circularObj = { a: 1 };
      circularObj.self = circularObj;

      // Test jsonMutator with problematic inputs
      expect(() => Mutators.jsonMutator('postgresql', circularObj)).not.toThrow();

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
    it("should return null as-is for any dialect", () => {
      expect(Mutators.jsonMutator('postgresql', null)).toBeNull();
      expect(Mutators.jsonMutator('mysql', null)).toBeNull();
    });

    describe("postgresql dialect — node-postgres pre-parses JSON, strings are already scalars", () => {
      it("should wrap a plain string scalar in JSON.stringify so the cell shows outer quotes", () => {
        expect(Mutators.jsonMutator('postgresql', 'hello')).toBe('"hello"');
      });

      it("should wrap a string scalar that looks like a JSON object in JSON.stringify", () => {
        // The core bug: a JSONB string scalar '{"hello":"world"}' must display as
        // "{\"hello\":\"world\"}" (with outer quotes), not as {"hello":"world"} which
        // is visually identical to a real JSONB object.
        const value = '{"hello":"world"}';
        const result = Mutators.jsonMutator('postgresql', value);
        expect(result).toBe(JSON.stringify(value));
        expect(result).not.toBe(value);
      });

      it("should return JSONB objects via friendlyJsonObject (with custom toString)", () => {
        const result = Mutators.jsonMutator('postgresql', { hello: "world" });
        // friendlyJsonObject returns the same object enhanced with toString() — not a plain string
        expect(typeof result).toBe("object");
        expect(JSON.parse(String(result))).toEqual({ hello: "world" });
      });

      it("should pass numbers and booleans through unchanged", () => {
        expect(Mutators.jsonMutator('postgresql', 42)).toBe(42);
        expect(Mutators.jsonMutator('postgresql', true)).toBe(true);
      });
    });

    describe("mysql dialect — driver returns JSON as raw strings, no pre-parsing", () => {
      it("should return a JSON object string as-is so the cell shows the raw JSON", () => {
        // mysql2 returns '{"hello":"world"}' for a JSON object column — display it directly
        const value = '{"hello":"world"}';
        expect(Mutators.jsonMutator('mysql', value)).toBe(value);
      });

      it("should return a plain string value as-is", () => {
        expect(Mutators.jsonMutator('mysql', 'hello')).toBe('hello');
      });
    });
  });
});
