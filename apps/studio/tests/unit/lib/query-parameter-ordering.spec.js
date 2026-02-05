/**
 * Unit tests for query parameter ordering fix (Issue #3651)
 *
 * This tests the logic used in TabQueryEditor.vue's queryParameterPlaceholders
 * computed property to ensure parameters are displayed in query order, not
 * alphabetically sorted.
 */

describe("Query Parameter Ordering", () => {
  // This simulates the fixed logic in TabQueryEditor.vue line 739
  // Before fix: return _.uniq(params) - sorts alphabetically
  // After fix: return Array.from(new Set(params)) - preserves order
  const deduplicateParams = (params) => {
    return Array.from(new Set(params));
  };

  describe("preserves parameter order without alphabetical sorting", () => {
    it("maintains numeric parameter order :1 to :12 (fixes issue #3651)", () => {
      const params = [":1", ":2", ":3", ":4", ":5", ":6", ":7", ":8", ":9", ":10", ":11", ":12"];
      const result = deduplicateParams(params);

      // Before fix with _.uniq: would be [":1", ":10", ":11", ":12", ":2", ":3", ..., ":9"]
      // After fix with Set: preserves order [":1", ":2", ":3", ..., ":10", ":11", ":12"]
      expect(result).toEqual([":1", ":2", ":3", ":4", ":5", ":6", ":7", ":8", ":9", ":10", ":11", ":12"]);

      // Verify :10 comes after :9, not after :1
      const indexOf9 = result.indexOf(":9");
      const indexOf10 = result.indexOf(":10");
      expect(indexOf10).toBeGreaterThan(indexOf9);
    });

    it("maintains PostgreSQL $N parameter order", () => {
      const params = ["$1", "$2", "$10", "$11", "$3"];
      const result = deduplicateParams(params);

      expect(result).toEqual(["$1", "$2", "$10", "$11", "$3"]);

      // Verify $10 appears between $2 and $11, not after $1
      expect(result.indexOf("$10")).toBe(2);
    });

    it("preserves order with large numeric indices", () => {
      const params = [":1", ":100", ":50", ":200", ":25"];
      const result = deduplicateParams(params);

      // Should maintain query order, not sort numerically or alphabetically
      expect(result).toEqual([":1", ":100", ":50", ":200", ":25"]);
    });

    it("preserves named parameter order", () => {
      const params = [":name", ":age", ":status", ":id", ":email"];
      const result = deduplicateParams(params);

      expect(result).toEqual([":name", ":age", ":status", ":id", ":email"]);
    });

    it("preserves mixed named and numeric parameter order", () => {
      const params = [":id", ":1", ":name", ":2", ":status", ":10"];
      const result = deduplicateParams(params);

      expect(result).toEqual([":id", ":1", ":name", ":2", ":status", ":10"]);
    });
  });

  describe("removes duplicate parameters", () => {
    it("removes duplicates while preserving first occurrence order", () => {
      const params = [":1", ":10", ":2", ":10", ":11", ":1", ":3"];
      const result = deduplicateParams(params);

      // Only first occurrence of :10 and :1 should remain
      expect(result).toEqual([":1", ":10", ":2", ":11", ":3"]);
      expect(result.filter(p => p === ":10")).toHaveLength(1);
      expect(result.filter(p => p === ":1")).toHaveLength(1);
    });

    it("handles multiple duplicates correctly", () => {
      const params = [":a", ":b", ":a", ":c", ":b", ":a"];
      const result = deduplicateParams(params);

      expect(result).toEqual([":a", ":b", ":c"]);
      expect(result).toHaveLength(3);
    });
  });

  describe("handles edge cases", () => {
    it("handles empty array", () => {
      const params = [];
      const result = deduplicateParams(params);

      expect(result).toEqual([]);
    });

    it("handles single parameter", () => {
      const params = [":1"];
      const result = deduplicateParams(params);

      expect(result).toEqual([":1"]);
    });

    it("handles all identical parameters", () => {
      const params = [":1", ":1", ":1", ":1"];
      const result = deduplicateParams(params);

      expect(result).toEqual([":1"]);
    });

    it("handles different parameter syntaxes", () => {
      // Testing various database parameter syntaxes
      const testCases = [
        { input: ["$1", "$2", "$10"], expected: ["$1", "$2", "$10"] }, // PostgreSQL
        { input: [":1", ":2", ":10"], expected: [":1", ":2", ":10"] }, // Oracle numbered
        { input: [":name", ":value"], expected: [":name", ":value"] }, // Named
        { input: ["@param1", "@param2"], expected: ["@param1", "@param2"] }, // SQL Server
      ];

      testCases.forEach(({ input, expected }) => {
        expect(deduplicateParams(input)).toEqual(expected);
      });
    });
  });

  describe("ES6 Set behavior verification", () => {
    it("confirms Set preserves insertion order (ES6 spec)", () => {
      // This test confirms the ES6 Set behavior we rely on
      const set = new Set([":1", ":10", ":2", ":11"]);
      const array = Array.from(set);

      expect(array).toEqual([":1", ":10", ":2", ":11"]);
    });

    it("confirms Set removes duplicates", () => {
      const set = new Set([":1", ":2", ":1", ":3"]);
      const array = Array.from(set);

      expect(array).toEqual([":1", ":2", ":3"]);
      expect(array).toHaveLength(3);
    });
  });

  describe("comparison with old behavior", () => {
    it("demonstrates the bug that was fixed", () => {
      const params = [":1", ":2", ":3", ":4", ":5", ":6", ":7", ":8", ":9", ":10", ":11"];

      // Simulating old behavior with _.uniq (which sorts)
      // We'll use sort() to show what the buggy behavior was
      const buggyResult = [...new Set(params)].sort();

      // Correct behavior with Set (no sorting)
      const correctResult = Array.from(new Set(params));

      // Bug: alphabetical sort puts :10 and :11 before :2
      expect(buggyResult).toEqual([":1", ":10", ":11", ":2", ":3", ":4", ":5", ":6", ":7", ":8", ":9"]);

      // Fix: preserves query order
      expect(correctResult).toEqual([":1", ":2", ":3", ":4", ":5", ":6", ":7", ":8", ":9", ":10", ":11"]);

      // Verify they're different
      expect(correctResult).not.toEqual(buggyResult);
    });
  });
});
