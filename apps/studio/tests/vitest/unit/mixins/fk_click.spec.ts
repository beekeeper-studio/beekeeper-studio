import { describe, it, expect, vi } from "vitest";
import { FkLinkMixin } from "@/mixins/fk_click";

describe("FkLinkMixin.openReferencedByMenu", () => {
  const key = {
    isComposite: false,
    fromTable: "order_items",
    fromSchema: "",
    fromColumn: "order_id",
    toTable: "orders",
    toSchema: "",
    toColumn: "id",
  };

  function open(keys) {
    const ctx = { $bks: { openMenu: vi.fn() }, referencedByClick: vi.fn() };
    FkLinkMixin.methods.openReferencedByMenu.call(ctx, new MouseEvent("click"), { cell: true }, keys);
    return ctx;
  }

  it("titles the menu and lists one item per referencing key", () => {
    const ctx = open([key, { ...key, fromTable: "payments" }]);
    const args = ctx.$bks.openMenu.mock.calls[0][0];

    expect(args.heading).toBe("Referenced by");
    expect(args.menuClass).toBe("referenced-by-menu");
    expect(args.options.map((o) => o.name)).toEqual(["order_items", "payments"]);
    expect(args.options.every((o) => !o.disabled)).toBe(true);
  });

  it("puts the referencing columns on a second line, with the full name on hover", () => {
    const ctx = open([{ ...key, isComposite: true, fromColumn: ["order_id", "line_no"], toColumn: ["id", "line_no"] }]);
    const [option] = ctx.$bks.openMenu.mock.calls[0][0].options;

    expect(option.name).toBe("order_items");
    expect(option.description).toBe("order_id, line_no");
    expect(option.title).toBe("order_items (order_id, line_no)");
  });

  it("opens the chosen table", () => {
    const ctx = open([key]);
    ctx.$bks.openMenu.mock.calls[0][0].options[0].handler();

    expect(ctx.referencedByClick).toHaveBeenCalledWith(key, { cell: true });
  });

  it("doesn't open an empty menu", () => {
    const ctx = open([]);
    expect(ctx.$bks.openMenu).not.toHaveBeenCalled();
  });
});

describe("FkLinkMixin.fkClick", () => {
  function clickOn(field, rowData, key) {
    const row = { getCell: (name) => (name in rowData ? { getValue: () => rowData[name] } : undefined) };
    const cell = {
      getField: () => field,
      getValue: () => rowData[field],
      getRow: () => row,
      getColumn: () => ({ getDefinition: () => ({ formatterParams: {} }) }),
    };
    const ctx = {
      $store: { state: { tables: [{ name: key.toTable, schema: "" }] }, getters: { isCommunity: false } },
      $root: { $emit: vi.fn() },
      $noty: { error: vi.fn() },
      trigger: vi.fn(),
      connection: { getPrimaryKey: vi.fn() },
    };
    return FkLinkMixin.methods.fkClick.call(ctx, key, cell).then(() => ctx.$root.$emit.mock.calls[0][1]);
  }

  it("filters each column of a composite key by its own value", async () => {
    const key = {
      isComposite: true,
      fromTable: "line_adjustments",
      fromSchema: "",
      fromColumn: ["order_id", "line_no"],
      toTable: "order_lines",
      toSchema: "",
      toColumn: ["order_id", "line_no"],
    };
    const payload = await clickOn("order_id", { id: 2, order_id: 1006, line_no: 2 }, key);

    expect(payload.filters).toEqual([
      { field: "order_id", type: "=", value: 1006 },
      { field: "line_no", type: "=", value: 2 },
    ]);
  });

  it("filters a single column key by the clicked value", async () => {
    const key = {
      isComposite: false,
      fromTable: "orders",
      fromSchema: "",
      fromColumn: "customer_id",
      toTable: "customers",
      toSchema: "",
      toColumn: "id",
    };
    const payload = await clickOn("customer_id", { id: 1006, customer_id: 6 }, key);

    expect(payload.filters).toEqual([{ field: "id", type: "=", value: 6 }]);
  });
});
