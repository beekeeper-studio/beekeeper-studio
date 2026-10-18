import { describe, it, expect } from "vitest";
import { ForeignKeyRow, groupForeignKeyRows } from "@/lib/db/clients/foreignKeys";

function row(overrides: Partial<ForeignKeyRow> = {}): ForeignKeyRow {
  return {
    constraintName: "orders_customer_fk",
    fromSchema: "public",
    fromTable: "orders",
    fromColumn: "customer_id",
    toSchema: "public",
    toTable: "customers",
    toColumn: "id",
    ordinalPosition: 1,
    onUpdate: "NO ACTION",
    onDelete: "CASCADE",
    ...overrides,
  };
}

describe("groupForeignKeyRows", () => {
  it("returns an empty list for no rows", () => {
    expect(groupForeignKeyRows([])).toEqual([]);
  });

  it("maps a single-column key to string columns", () => {
    expect(groupForeignKeyRows([row()])).toEqual([
      {
        constraintName: "orders_customer_fk",
        fromSchema: "public",
        fromTable: "orders",
        fromColumn: "customer_id",
        toSchema: "public",
        toTable: "customers",
        toColumn: "id",
        onUpdate: "NO ACTION",
        onDelete: "CASCADE",
        isComposite: false,
      },
    ]);
  });

  it("collapses the columns of one constraint into a composite key, paired by position", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "child_fk", fromColumn: "ref_id2", toColumn: "parent_id2", ordinalPosition: 2 }),
      row({ constraintName: "child_fk", fromColumn: "ref_id1", toColumn: "parent_id1", ordinalPosition: 1 }),
    ]);

    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({
      constraintName: "child_fk",
      isComposite: true,
      fromColumn: ["ref_id1", "ref_id2"],
      toColumn: ["parent_id1", "parent_id2"],
    });
  });

  it("keeps input order when rows carry no position", () => {
    const keys = groupForeignKeyRows([
      row({ fromColumn: "b", toColumn: "y", ordinalPosition: undefined }),
      row({ fromColumn: "a", toColumn: "x", ordinalPosition: null }),
    ]);

    expect(keys[0]).toMatchObject({
      isComposite: true,
      fromColumn: ["b", "a"],
      toColumn: ["y", "x"],
    });
  });

  it("does not merge same-named constraints on different tables", () => {
    // PostgreSQL constraint names are only unique per table, and SQLite's
    // pragma ids restart at 0 for every table. Incoming keys from two tables
    // can therefore share a name and must stay separate.
    const keys = groupForeignKeyRows([
      row({ constraintName: 0, fromTable: "orders", fromColumn: "customer_id" }),
      row({ constraintName: 0, fromTable: "invoices", fromColumn: "billed_to" }),
    ]);

    expect(keys).toHaveLength(2);
    expect(keys.map((k) => [k.fromTable, k.fromColumn, k.constraintName])).toEqual([
      ["orders", "customer_id", "0"],
      ["invoices", "billed_to", "0"],
    ]);
    expect(keys.every((k) => !k.isComposite)).toBe(true);
  });

  it("does not merge one column that links to several tables", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "orders_owner_fkey", fromColumn: "owner", toTable: "person", ordinalPosition: null }),
      row({ constraintName: "orders_owner_fkey", fromColumn: "owner", toTable: "company", ordinalPosition: null }),
    ]);

    expect(keys.map((k) => k.toTable)).toEqual(["person", "company"]);
    expect(keys.every((k) => k.toColumn === "id")).toBe(true);
    expect(keys.every((k) => k.isComposite === false)).toBe(true);
  });

  it("keeps constraints in order of first appearance", () => {
    const keys = groupForeignKeyRows([
      row({ constraintName: "zeta_fk", fromColumn: "z" }),
      row({ constraintName: "alpha_fk", fromColumn: "a" }),
    ]);

    expect(keys.map((k) => k.constraintName)).toEqual(["zeta_fk", "alpha_fk"]);
  });

  it("normalizes missing schemas, names and actions to the TableKey contract", () => {
    const [key] = groupForeignKeyRows([
      row({
        constraintName: null,
        fromSchema: null,
        toSchema: undefined,
        onUpdate: null,
        onDelete: undefined,
      }),
    ]);

    expect(key.constraintName).toBeUndefined();
    expect(key.fromSchema).toBe("");
    expect(key.toSchema).toBe("");
    expect(key.onUpdate).toBeUndefined();
    expect(key.onDelete).toBeUndefined();
  });
});
