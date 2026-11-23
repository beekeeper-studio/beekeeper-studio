import { describe, it, expect } from "vitest";
import TableListItem from "@/components/sidebar/core/table_list/TableListItem.vue";
import StatelessTableListItem from "@/components/sidebar/core/table_list/StatelessTableListItem.vue";
import { isTableActiveInTab } from "@/common/utils";

describe("isTableActiveInTab util", () => {
  it("returns true when activeTab uses tableName/schemaName", () => {
    expect(
      isTableActiveInTab(
        { name: "users", schema: "public" },
        { tabType: "table", tableName: "users", schemaName: "public" }
      )
    ).toBe(true);
  });

  it("returns true when activeTab uses table.name/table.schema", () => {
    expect(
      isTableActiveInTab(
        { name: "orders", schema: "public" },
        { tabType: "table-properties", table: { name: "orders", schema: "public" } }
      )
    ).toBe(true);
  });

  it("returns false when activeTab is a different table or tabType", () => {
    expect(
      isTableActiveInTab(
        { name: "users", schema: "public" },
        { tabType: "table", tableName: "orders", schemaName: "public" }
      )
    ).toBe(false);

    expect(
      isTableActiveInTab(
        { name: "users", schema: "public" },
        { tabType: "query", tableName: "users" }
      )
    ).toBe(false);
  });

  it("handles null or undefined safely", () => {
    expect(isTableActiveInTab(null, { tabType: "table" })).toBe(false);
    expect(isTableActiveInTab({ name: "users" }, null)).toBe(false);
  });
});

describe("TableListItem / StatelessTableListItem — active highlight (#4843)", () => {
  const tableListItemActive = (TableListItem as any).options?.computed?.active ?? (TableListItem as any).computed?.active;
  const statelessActive = (StatelessTableListItem as any).options?.computed?.active ?? (StatelessTableListItem as any).computed?.active;

  [
    { name: "TableListItem", fn: tableListItemActive },
    { name: "StatelessTableListItem", fn: statelessActive },
  ].forEach(({ name, fn }) => {
    describe(name, () => {
      it("returns true when activeTab uses tableName/schemaName (as openTable does)", () => {
        const ctx = {
          table: { name: "users", schema: "public" },
          activeTab: {
            tabType: "table",
            tableName: "users",
            schemaName: "public",
          },
        };
        expect(fn.call(ctx)).toBe(true);
      });

      it("returns true when activeTab uses table.name/table.schema", () => {
        const ctx = {
          table: { name: "orders", schema: "public" },
          activeTab: {
            tabType: "table-properties",
            table: { name: "orders", schema: "public" },
          },
        };
        expect(fn.call(ctx)).toBe(true);
      });

      it("returns false when activeTab is a different table or tabType", () => {
        const ctxDiffTable = {
          table: { name: "users", schema: "public" },
          activeTab: {
            tabType: "table",
            tableName: "orders",
            schemaName: "public",
          },
        };
        expect(fn.call(ctxDiffTable)).toBe(false);

        const ctxQueryTab = {
          table: { name: "users", schema: "public" },
          activeTab: {
            tabType: "query",
            tableName: "users",
          },
        };
        expect(fn.call(ctxQueryTab)).toBe(false);
      });
    });
  });
});
