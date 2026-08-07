import TableTable from "@/components/tableview/TableTable.vue";

// Regression coverage for #4222.
// `buildPendingInserts` used to JSON.stringify every postgres jsonb cell, even
// when the user typed a string (which Tabulator hands back unparsed). That
// double-encoded the value before it ever left the renderer.
describe("TableTable.vue — buildPendingInserts", () => {
  const buildPendingInserts = (TableTable as any).options.methods.buildPendingInserts;

  function makeContext({
    columns,
    rowData,
    dialect = "postgresql",
  }: {
    columns: { columnName: string; dataType: string; generated?: boolean }[];
    rowData: Record<string, unknown>;
    dialect?: string;
  }) {
    return {
      table: {
        name: "jsontest",
        schema: "public",
        columns,
      },
      dialect,
      dialectData: { requireDataset: false },
      database: "banana",
      pendingChanges: {
        inserts: [{ row: { getData: () => rowData } }],
        updates: [],
        deletes: [],
      },
      isPrimaryKey(col: string) {
        return col === "id";
      },
    };
  }

  it("does not JSON.stringify a jsonb cell that is already a string (issue-4222)", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 1, data: '{"hello":"world"}' },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('{"hello":"world"}');
  });

  it("JSON.stringifies a jsonb cell when the value is an object", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 2, data: { hello: "world" } },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('{"hello":"world"}');
  });

  it("leaves a JSON scalar string for a jsonb cell untouched (issue-4222)", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 3, data: '"plain"' },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('"plain"');
  });

  it("does not touch jsonb cells on non-postgres dialects", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 4, data: { hello: "world" } },
      dialect: "mysql",
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toEqual({ hello: "world" });
  });
});

// Regression coverage for #4567.
// `refreshTable()` used to re-fetch table KEYS but not column metadata, so a
// column rename was invisible after Refresh until the connection was reopened.
describe("TableTable.vue — refreshTable re-fetches columns (#4567)", () => {
  const refreshTable = (TableTable as any).options.methods.refreshTable;

  function makeRefreshCtx({ table }: { table: any }) {
    return {
      // the component instance state refreshTable touches:
      table,
      tabulator: {
        getPage: () => 1,
        replaceData: jest.fn().mockResolvedValue(undefined),
        getColumnLayout: () => [],
        setColumns: jest.fn().mockResolvedValue(undefined),
        setColumnLayout: jest.fn(),
        setPage: jest.fn(),
      },
      tableColumns: [],
      active: true,
      forceRedraw: false,
      // sibling method refreshTable calls:
      getTableKeys: jest.fn().mockResolvedValue(undefined),
      // the store dispatch we are asserting on:
      $store: { dispatch: jest.fn().mockResolvedValue(undefined) },
    };
  }

  it("dispatches updateTableColumns on explicit refresh (issue-4567)", async () => {
    const table = { name: "t", schema: "public", columns: [{ columnName: "c" }] };
    const ctx = makeRefreshCtx({ table });

    await refreshTable.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateTableColumns", table);
  });
});
