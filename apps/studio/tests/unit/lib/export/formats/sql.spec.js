import { SqlExporter } from '@/lib/export/formats/sql'


describe('sql exporter', () => {

  let exporter = new SqlExporter("./tmp/sql.export", {connectionType: 'postgresql'}, { name: 'table'}, '', '', [], {}, {})

  it("Should generate a basic insert", () => {
    const input = ['a', 'b']
    const result = exporter.formatRow(input)
    expect(result).toBe(`insert into "table" ("col_1", "col_2") values ('a', 'b')`)
  });

  it("Should preserve column order in the insert", () => {
    const orderedExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "postgresql" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: true }
    );

    const columns = [
      { columnName: "id", dataType: "int" },
      { columnName: "name", dataType: "varchar" },
      { columnName: "age", dataType: "int" },
    ];
    orderedExporter.columns = columns
    const input = [1, "Alice", 20];

    const result = orderedExporter.formatRow(input, columns);
    expect(result).toBe(`insert into "table" ("id", "name", "age") values (1, 'Alice', 20)`);
  });

  it("Should keep Knex's default column order unless enabled", () => {
    const defaultExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "postgresql" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: false }
    );

    const columns = [
      { columnName: "id", dataType: "int" },
      { columnName: "name", dataType: "varchar" },
      { columnName: "age", dataType: "int" },
    ];
    defaultExporter.columns = columns;

    const result = defaultExporter.formatRow([1, "Alice", 20], columns);
    expect(result).toBe(`insert into "table" ("age", "id", "name") values (20, 1, 'Alice')`);
  });

  it("Should preserve the order of numeric-looking column names", () => {
    const orderedExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "postgresql" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: true }
    );

    const columns = [
      { columnName: "10", dataType: "int" },
      { columnName: "2", dataType: "int" },
      { columnName: "1", dataType: "int" },
    ];
    orderedExporter.columns = columns;

    const result = orderedExporter.formatRow([10, 2, 1], columns);
    expect(result).toBe(`insert into "table" ("10", "2", "1") values (10, 2, 1)`);
  });

  it("Should preserve an empty column name", () => {
    const namedExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "postgresql" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: true }
    );

    const columns = [{ columnName: "", dataType: "int" }];
    namedExporter.columns = columns;

    const result = namedExporter.formatRow([1], columns);
    expect(result).toBe(`insert into "table" ("") values (1)`);
  });

  it("Should fall back to generated names when a column name is missing", () => {
    const columns = [{ dataType: "int" }];

    const result = exporter.formatRow([1], columns);
    expect(result).toBe(`insert into "table" ("col_1") values (1)`);
  });

  it("Should use DEFAULT for undefined values", () => {
    const undefinedExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "postgresql" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: true }
    );
    const columns = [{ columnName: "id", dataType: "int" }];
    undefinedExporter.columns = columns;

    const result = undefinedExporter.formatRow([undefined], columns);
    expect(result).toBe(`insert into "table" ("id") values (DEFAULT)`);
  });

  it("Should reject undefined values for SQLite", () => {
    const sqliteExporter = new SqlExporter(
      "./tmp/sql.export",
      { connectionType: "sqlite" },
      { name: "table" },
      "",
      "",
      [],
      {},
      { preserveColumnOrder: true }
    );
    const columns = [{ columnName: "id", dataType: "int" }];
    sqliteExporter.columns = columns;

    expect(() => sqliteExporter.formatRow([undefined], columns)).toThrow(
      "SQLite does not support DEFAULT in INSERT values"
    );
  });

  it("Should generate an insert with json", () => {
    const input = ['a', {x: 'y'}];
    const result = exporter.formatRow(input)
    expect(result).toBe(`insert into "table" ("col_1", "col_2") values ('a', '{"x":"y"}')`)
  });

  it("Should generate an insert with quoted string values", () => {
    const input = ["a'\nb"]
    const result = exporter.formatRow(input)
    expect(result).toBe(`insert into "table" ("col_1") values ('a''\nb')`)
  })

  it("Should convert boolean bit(1) true to 1", () => {
    const columns = [{ dataType: 'int' }, { dataType: 'bit(1)' }]
    const result = exporter.formatRow([1, true], columns)
    expect(result).not.toContain('NaN')
    expect(result).toContain('1')
  })

  it("Should convert boolean bit(1) false to 0", () => {
    const columns = [{ dataType: 'int' }, { dataType: 'bit(1)' }]
    const result = exporter.formatRow([2, false], columns)
    expect(result).not.toContain('NaN')
    expect(result).toContain('0')
  })

  it("Should handle null bit(1) values", () => {
    const columns = [{ dataType: 'bit(1)' }]
    const result = exporter.formatRow([null], columns)
    expect(result).not.toContain('NaN')
  })

  it("Should handle Buffer bit(1) values", () => {
    const columns = [{ dataType: 'bit(1)' }]
    const result = exporter.formatRow([Buffer.from([1])], columns)
    expect(result).not.toContain('NaN')
    expect(result).toContain('1')
  })

  it("Should handle Buffer bit(1) value of 0", () => {
    const columns = [{ dataType: 'bit(1)' }]
    const result = exporter.formatRow([Buffer.from([0])], columns)
    expect(result).not.toContain('NaN')
    expect(result).toContain('0')
  })

  it("Should set defaultPath correctly after refactor", () => {
    const safeFilename = "exported_data";
    let exporter = new SqlExporter(`${safeFilename}.sql`, {connectionType: 'postgresql'}, { name: 'table'}, '', '', [], {}, {})

    const result = exporter.getFileName();
    expect(result).toBe("exported_data.sql");
  });
});
