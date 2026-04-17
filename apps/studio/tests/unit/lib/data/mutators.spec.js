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
});
