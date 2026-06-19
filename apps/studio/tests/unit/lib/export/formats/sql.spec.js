import { SqlExporter } from '@/lib/export/formats/sql'


describe('sql exporter', () => {

  let exporter = new SqlExporter("./tmp/sql.export", {connectionType: 'postgresql'}, { name: 'table'}, '', '', [], {}, {})

  it("Should generate a basic insert", () => {
    const input = ['a', 'b']
    const result = exporter.formatRow(input)
    expect(result).toBe(`insert into "table" ("col_1", "col_2") values ('a', 'b')`)
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

    expect(exporter.getFileName()).toBe("exported_data.sql");
  });
});
