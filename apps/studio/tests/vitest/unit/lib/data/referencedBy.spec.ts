import { describe, it, expect } from "vitest";
import {
  buildReferencedByFilters,
  groupIncomingKeysByColumn,
  keyColumnPairs,
  referencedByColumns,
  referencedByLabel,
  referencedByMenuLabels,
  referencedByTable,
  referencedByTooltip,
} from "@/lib/data/referencedBy";

function key(overrides = {}) {
  return {
    isComposite: false,
    fromTable: "order_items",
    fromSchema: "public",
    fromColumn: "order_id",
    toTable: "orders",
    toSchema: "public",
    toColumn: "id",
    ...overrides,
  };
}

const compositeKey = key({
  isComposite: true,
  fromTable: "shipment_lines",
  fromColumn: ["order_id", "line_no"],
  toColumn: ["id", "line_no"],
});

describe("referencedBy", () => {
  describe("keyColumnPairs", () => {
    it("pairs single column keys", () => {
      expect(keyColumnPairs(key())).toEqual([{ from: "order_id", to: "id" }]);
    });

    it("pairs composite keys in order", () => {
      expect(keyColumnPairs(compositeKey)).toEqual([
        { from: "order_id", to: "id" },
        { from: "line_no", to: "line_no" },
      ]);
    });

    it("returns nothing when the columns don't line up", () => {
      expect(keyColumnPairs(key({ toColumn: ["id", "other"] }))).toEqual([]);
      expect(keyColumnPairs(key({ toColumn: null }))).toEqual([]);
      expect(keyColumnPairs(key({ toColumn: [null, "id"], fromColumn: ["a", "b"] }))).toEqual([]);
    });

    it("returns nothing for a key that repeats a column", () => {
      // BigQuery pairs every referencing column with every referenced one
      const crossJoined = key({
        isComposite: true,
        fromColumn: ["order_id", "order_id", "line_no", "line_no"],
        toColumn: ["id", "line_no", "id", "line_no"],
      });
      expect(keyColumnPairs(crossJoined)).toEqual([]);
      expect(buildReferencedByFilters(crossJoined, { id: 1, line_no: 2 })).toBeNull();
    });
  });

  describe("groupIncomingKeysByColumn", () => {
    it("groups keys under each column they reference", () => {
      const payments = key({ fromTable: "payments" });
      const result = groupIncomingKeysByColumn([key(), payments, compositeKey]);

      expect(Object.keys(result).sort()).toEqual(["id", "line_no"]);
      expect(result.id.map((k) => k.fromTable)).toEqual(["order_items", "payments", "shipment_lines"]);
      expect(result.line_no).toEqual([compositeKey]);
    });
  });

  describe("buildReferencedByFilters", () => {
    it("filters the referencing column by this row's value", () => {
      expect(buildReferencedByFilters(key(), { id: 1006, status: "refunded" })).toEqual([
        { field: "order_id", type: "=", value: 1006, op: "AND" },
      ]);
    });

    it("filters every column of a composite key", () => {
      expect(buildReferencedByFilters(compositeKey, { id: 1006, line_no: 2 })).toEqual([
        { field: "order_id", type: "=", value: 1006, op: "AND" },
        { field: "line_no", type: "=", value: 2, op: "AND" },
      ]);
    });

    it("returns null when a referenced value is missing", () => {
      expect(buildReferencedByFilters(key(), { id: null })).toBeNull();
      expect(buildReferencedByFilters(compositeKey, { id: 1006 })).toBeNull();
    });

    it("keeps falsy values that aren't null", () => {
      expect(buildReferencedByFilters(key(), { id: 0 })[0].value).toBe(0);
    });
  });

  describe("referencedByTable and referencedByColumns", () => {
    it("split the label into the table and its key columns", () => {
      expect(referencedByTable(key())).toBe("order_items");
      expect(referencedByTable(key({ fromSchema: "billing" }))).toBe("billing.order_items");
      expect(referencedByColumns(compositeKey)).toBe("order_id, line_no");
    });
  });

  describe("referencedByLabel", () => {
    it("names the table and column", () => {
      expect(referencedByLabel(key())).toBe("order_items (order_id)");
      expect(referencedByLabel(compositeKey)).toBe("shipment_lines (order_id, line_no)");
    });

    it("qualifies tables in another schema", () => {
      expect(referencedByLabel(key({ fromSchema: "billing" }))).toBe("billing.order_items (order_id)");
    });

    it("doesn't qualify when there are no schemas", () => {
      expect(referencedByLabel(key({ fromSchema: "", toSchema: "" }))).toBe("order_items (order_id)");
    });
  });

  describe("two columns in one table referencing this table", () => {
    // like films.language_id and films.original_language_id -> languages.id
    const language = key({ fromTable: "films", fromColumn: "language_id", toTable: "languages", constraintName: 1 });
    const original = key({ fromTable: "films", fromColumn: "original_language_id", toTable: "languages", constraintName: 0 });

    it("keeps them as separate keys on the referenced column", () => {
      expect(groupIncomingKeysByColumn([language, original]).id).toEqual([language, original]);
    });

    it("filters each on its own column", () => {
      expect(buildReferencedByFilters(language, { id: 2 })).toEqual([{ field: "language_id", type: "=", value: 2, op: "AND" }]);
      expect(buildReferencedByFilters(original, { id: 2 })).toEqual([{ field: "original_language_id", type: "=", value: 2, op: "AND" }]);
    });

    it("adds the column to the menu label only where the table repeats", () => {
      expect(referencedByMenuLabels([language, original, key({ fromTable: "rentals" })])).toEqual([
        { table: "films", columns: "language_id" },
        { table: "films", columns: "original_language_id" },
        { table: "rentals" },
      ]);
    });
  });

  describe("referencedByTooltip", () => {
    const tables = (...names) => names.map((fromTable) => key({ fromTable }));

    it("lists the referencing tables", () => {
      expect(referencedByTooltip(tables("a"))).toBe("Referenced by a");
      expect(referencedByTooltip(tables("a", "b"))).toBe("Referenced by a and b");
      expect(referencedByTooltip(tables("a", "b", "c"))).toBe("Referenced by a, b, and c");
    });

    it("summarises long lists and repeated tables", () => {
      expect(referencedByTooltip(tables("a", "b", "c", "d", "e"))).toBe("Referenced by a, b, c, and 2 more");
      expect(referencedByTooltip(tables("a", "a"))).toBe("Referenced by a");
    });
  });
});
