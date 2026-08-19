import {
  formatStructure,
  structureColumns,
  structureFilter,
  tabulatorStructureColumns,
} from "@/lib/tableinfo/structure";

// A trimmed down version of what TableSchema.vue hands to tabulator
const schemaColumnDefs: any[] = [
  { title: null, rowHandle: true, formatter: "handle" },
  { title: "Name", field: "columnName" },
  { title: "Type", field: "dataType" },
  { title: "Nullable", field: "nullable" },
  { title: "Default Value", field: "defaultValue" },
  { title: "Primary", field: "primary" },
  { field: "trash-button", title: null },
];

const schemaRows = [
  {
    columnName: "id",
    dataType: "int4",
    nullable: false,
    defaultValue: "nextval('a_id_seq')",
    primary: true,
  },
  {
    columnName: "name",
    dataType: "varchar(255)",
    nullable: true,
    defaultValue: null,
    primary: null,
  },
];

describe("structureColumns", () => {
  it("drops the row handle and the trash button", () => {
    expect(structureColumns(schemaColumnDefs)).toEqual([
      { field: "columnName", title: "Name" },
      { field: "dataType", title: "Type" },
      { field: "nullable", title: "Nullable" },
      { field: "defaultValue", title: "Default Value" },
      { field: "primary", title: "Primary" },
    ]);
  });

  it("falls back to the field name when a column has no title", () => {
    expect(structureColumns([{ field: "info" } as any])).toEqual([
      { field: "info", title: "info" },
    ]);
  });

  it("handles missing columns", () => {
    expect(structureColumns(undefined)).toEqual([]);
  });
});

describe("formatStructure", () => {
  const columns = structureColumns(schemaColumnDefs);

  it("copies as csv with the column titles as headers", () => {
    expect(formatStructure(schemaRows, columns, "csv")).toEqual(
      [
        "Name,Type,Nullable,Default Value,Primary",
        "id,int4,false,nextval('a_id_seq'),true",
        "name,varchar(255),true,,",
      ].join("\r\n")
    );
  });

  it("quotes csv values containing a delimiter", () => {
    const rows = [{ columnName: 'a "b", c' }];
    const cols = structureColumns([{ field: "columnName", title: "Name" } as any]);
    expect(formatStructure(rows, cols, "csv")).toEqual(
      'Name\r\n"a ""b"", c"'
    );
  });

  it("copies as markdown", () => {
    expect(formatStructure(schemaRows, columns, "markdown")).toEqual(
      [
        "| Name | Type         | Nullable | Default Value       | Primary |",
        "| ---- | ------------ | -------- | ------------------- | ------- |",
        "| id   | int4         | false    | nextval('a_id_seq') | true    |",
        "| name | varchar(255) | true     |                     |         |",
      ].join("\n")
    );
  });

  it("neutralizes pipes and newlines in markdown", () => {
    const rows = [{ condition: "a | b\nc" }];
    const cols = structureColumns([{ field: "condition", title: "Condition" } as any]);
    expect(formatStructure(rows, cols, "markdown")).toContain("a \\| b<br>c");
  });

  it("neutralizes backslashes in markdown so they can't un-escape a pipe", () => {
    // Unescaped, `\|` would come out as `\\|`: an escaped backslash followed
    // by a live pipe, which splits the cell.
    const rows = [{ condition: "a \\| b" }];
    const cols = structureColumns([{ field: "condition", title: "Condition" } as any]);
    expect(formatStructure(rows, cols, "markdown")).toContain("a \\\\\\| b");
  });

  it("copies as json keyed by column title", () => {
    expect(JSON.parse(formatStructure(schemaRows, columns, "json"))).toEqual([
      {
        Name: "id",
        Type: "int4",
        Nullable: false,
        "Default Value": "nextval('a_id_seq')",
        Primary: true,
      },
      {
        Name: "name",
        Type: "varchar(255)",
        Nullable: true,
        "Default Value": null,
        Primary: null,
      },
    ]);
  });

  it("nulls out fields the row doesn't have in json", () => {
    const cols = structureColumns([{ field: "comment", title: "Comment" } as any]);
    expect(JSON.parse(formatStructure([{}], cols, "json"))).toEqual([
      { Comment: null },
    ]);
  });

  it("flattens array values, like index columns", () => {
    const rows = [{ name: "idx_a", columns: ["a", "b DESC"] }];
    const cols = structureColumns([
      { field: "name", title: "Name" } as any,
      { field: "columns", title: "Columns" } as any,
    ]);
    expect(formatStructure(rows, cols, "csv")).toEqual(
      'Name,Columns\r\nidx_a,"a, b DESC"'
    );
    // json keeps the array so it stays machine readable
    expect(JSON.parse(formatStructure(rows, cols, "json"))).toEqual([
      { Name: "idx_a", Columns: ["a", "b DESC"] },
    ]);
  });

  it("stringifies objects", () => {
    const rows = [{ info: { a: 1 } }];
    const cols = structureColumns([{ field: "info", title: "Info" } as any]);
    expect(formatStructure(rows, cols, "csv")).toEqual('Info\r\n"{""a"":1}"');
  });

  it("copies headers only when there are no rows", () => {
    expect(formatStructure([], columns, "json")).toEqual("[]");
    expect(formatStructure([], columns, "csv")).toContain(
      "Name,Type,Nullable,Default Value,Primary"
    );
    expect(formatStructure([], columns, "markdown")).toEqual(
      [
        "| Name | Type | Nullable | Default Value | Primary |",
        "| ---- | ---- | -------- | ------------- | ------- |",
      ].join("\n")
    );
  });
});

describe("tabulatorStructureColumns", () => {
  function fakeTabulator(columns: any[]) {
    return {
      getColumns: () => columns.map((c) => ({
        isVisible: () => c.visible !== false,
        getDefinition: () => c,
      })),
    } as any;
  }

  it("reads the definitions off a live tabulator", () => {
    expect(tabulatorStructureColumns(fakeTabulator(schemaColumnDefs))).toEqual(
      structureColumns(schemaColumnDefs)
    );
  });

  it("skips hidden columns", () => {
    const columns = tabulatorStructureColumns(
      fakeTabulator([
        { field: "columnName", title: "Name" },
        { field: "dataType", title: "Type", visible: false },
      ])
    );
    expect(columns).toEqual([{ field: "columnName", title: "Name" }]);
  });

  it("handles a tab whose table isn't mounted yet", () => {
    expect(tabulatorStructureColumns(null)).toEqual([]);
  });
});

describe("structureFilter", () => {
  const fields = ["columnName", "dataType"];

  it("keeps rows matching any searched field", () => {
    expect(structureFilter(schemaRows[0], { term: "int", fields })).toBe(true);
    expect(structureFilter(schemaRows[1], { term: "nam", fields })).toBe(true);
  });

  it("drops rows that match nothing", () => {
    expect(structureFilter(schemaRows[0], { term: "zzz", fields })).toBe(false);
  });

  it("ignores fields that aren't searched", () => {
    // defaultValue holds the term, but it isn't in `fields`
    expect(
      structureFilter(schemaRows[0], { term: "nextval", fields })
    ).toBe(false);
  });

  it("keeps everything when the term is empty", () => {
    expect(structureFilter(schemaRows[0], { term: "", fields })).toBe(true);
  });

  it("searches flattened values, like index columns", () => {
    const row = { columns: ["a", "b DESC"] };
    expect(structureFilter(row, { term: "b desc", fields: ["columns"] })).toBe(true);
  });

  it("tolerates rows missing a searched field", () => {
    expect(structureFilter({}, { term: "a", fields })).toBe(false);
  });
});
