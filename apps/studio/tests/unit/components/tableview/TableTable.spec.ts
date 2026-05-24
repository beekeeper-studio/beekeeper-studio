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
