import { AppEvent } from "@/common/AppEvent";
import TableListContextMenus from "@/mixins/TableListContextMenus";

const tableMenuOptions = TableListContextMenus.computed.tableMenuOptions as () => any[];
const openSelectQuery = TableListContextMenus.methods.openSelectQuery as (
  payload: { item: any },
) => Promise<void>;

function createContext(connectionOverrides = {}) {
  const connection = {
    listTableColumns: jest.fn().mockResolvedValue([
      { columnName: "customer id", dataType: "integer" },
      { columnName: "status", dataType: "text" },
    ]),
    listMaterializedViewColumns: jest.fn(),
    selectTopSql: jest.fn().mockResolvedValue(
      'SELECT "customer id", "status" FROM "sales"."orders" LIMIT 1000 OFFSET 0',
    ),
    ...connectionOverrides,
  };
  const context = {
    $store: {
      getters: {
        dialect: "postgresql",
        dialectData: { disabledFeatures: {} },
      },
      state: {
        connection,
        usedConfig: { readOnlyMode: false },
      },
    },
    $root: { $emit: jest.fn() },
    $noty: { error: jest.fn() },
    openSelectQuery: jest.fn(),
    trigger: jest.fn(),
    $copyText: jest.fn(),
  };

  return { connection, context };
}

describe("TableListContextMenus", () => {
  it("offers a SQL: Select * action for tables", () => {
    const { context } = createContext();

    const option = tableMenuOptions.call(context).find(({ slug }) => slug === "sql-select");
    const item = { name: "orders", schema: "sales", entityType: "table" };

    expect(option).toMatchObject({ name: "SQL: Select *", slug: "sql-select" });
    option.handler({ item });
    expect(context.openSelectQuery).toHaveBeenCalledWith({ item });
  });

  it("opens a formatted query tab with every column and a 1000-row limit", async () => {
    const { connection, context } = createContext();
    const item = { name: "orders", schema: "sales", entityType: "table" };

    await openSelectQuery.call(context, { item });

    expect(connection.listTableColumns).toHaveBeenCalledWith("orders", "sales");
    expect(connection.selectTopSql).toHaveBeenCalledWith(
      "orders",
      0,
      1000,
      [],
      [],
      "sales",
      ["customer id", "status"],
    );
    expect(context.$root.$emit).toHaveBeenCalledWith(
      AppEvent.newTab,
      expect.stringContaining('"customer id"'),
    );
  });

  it("loads columns through the materialized-view API when needed", async () => {
    const columns = [{ columnName: "total", dataType: "numeric" }];
    const { connection, context } = createContext({
      listMaterializedViewColumns: jest.fn().mockResolvedValue(columns),
    });
    const item = { name: "sales_totals", schema: "reports", entityType: "materialized-view" };

    await openSelectQuery.call(context, { item });

    expect(connection.listMaterializedViewColumns).toHaveBeenCalledWith("sales_totals", "reports");
    expect(connection.listTableColumns).not.toHaveBeenCalled();
    expect(connection.selectTopSql).toHaveBeenCalledWith(
      "sales_totals",
      0,
      1000,
      [],
      [],
      "reports",
      ["total"],
    );
  });

  it("shows an error instead of opening an empty tab when query generation fails", async () => {
    const { context } = createContext({
      listTableColumns: jest.fn().mockRejectedValue(new Error("column lookup failed")),
    });

    await openSelectQuery.call(context, {
      item: { name: "orders", schema: "sales", entityType: "table" },
    });

    expect(context.$root.$emit).not.toHaveBeenCalled();
    expect(context.$noty.error).toHaveBeenCalledWith(
      "Unable to open query tab. See dev console for details.",
    );
  });
});
