import { BedrockClient } from "../../../../../src/lib/db/clients/bedrock";
import { SqliteChangeBuilder } from "../../../../../src/shared/lib/sql/change_builder/SqliteChangeBuilder";
import { SqliteData } from "../../../../../src/shared/lib/dialects/sqlite";

describe("Bedrock UNIT tests (no connection required)", () => {
  let client;

  beforeEach(() => {
    client = new BedrockClient(null, null);
  });

  afterEach(async () => {
    try { await client?.disconnect(); } catch (e) { /* ignore */ }
  });

  it("sets dialect to sqlite so sql-query-identifier understands it", () => {
    expect(client.dialect).toBe("sqlite");
  });

  it("uses SqliteData for dialect metadata", () => {
    expect(client.dialectData).toBe(SqliteData);
  });

  it("uses a sqlite3-flavored knex for query generation", () => {
    expect(client.knex).toBeDefined();
    expect(client.knex.client.config.client).toBe("sqlite3");
  });

  it("returns a SqliteChangeBuilder for DDL operations", () => {
    const builder = client.getBuilder("foo");
    expect(builder).toBeInstanceOf(SqliteChangeBuilder);
  });

  describe("parseTableColumn", () => {
    it("returns a minimal BksField for non-binary columns", () => {
      const result = client.parseTableColumn({ name: "id", type: "INTEGER" });
      expect(result).toEqual({ name: "id", bksType: "UNKNOWN" });
    });

    it("maps BLOB columns to BINARY", () => {
      const result = client.parseTableColumn({ name: "data", type: "BLOB" });
      expect(result).toEqual({ name: "data", bksType: "BINARY" });
    });

    it("is case insensitive on the type check", () => {
      const result = client.parseTableColumn({ name: "data", type: "blob" });
      expect(result).toEqual({ name: "data", bksType: "BINARY" });
    });
  });

  describe("dataToColumns (private, via listTableColumns shape)", () => {
    const tableName = "widgets";
    const rows = [
      { cid: 0, name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1, hidden: 0 },
      { cid: 1, name: "name", type: "TEXT", notnull: 0, dflt_value: "'unnamed'", pk: 0, hidden: 0 },
      { cid: 2, name: "deleted_null_literal", type: "TEXT", notnull: 0, dflt_value: "NULL", pk: 0, hidden: 0 },
      { cid: 3, name: "total", type: "REAL", notnull: 0, dflt_value: null, pk: 0, hidden: 2 },
    ];

    let columns;
    beforeEach(() => {
      columns = client.dataToColumns(rows, tableName);
    });

    it("maps tableName and ordinalPosition from cid", () => {
      expect(columns[0]).toMatchObject({ tableName, columnName: "id", ordinalPosition: 0 });
      expect(columns[3]).toMatchObject({ columnName: "total", ordinalPosition: 3 });
    });

    it("derives nullable from notnull", () => {
      expect(columns[0].nullable).toBe(false);
      expect(columns[1].nullable).toBe(true);
    });

    it('treats the literal string "NULL" as a null default', () => {
      expect(columns[2].defaultValue).toBeNull();
      expect(columns[2].hasDefault).toBe(false);
    });

    it("reports hasDefault=true for a real default expression", () => {
      expect(columns[1].defaultValue).toBe("'unnamed'");
      expect(columns[1].hasDefault).toBe(true);
    });

    it("flags generated columns when hidden is 2 or 3", () => {
      expect(columns[0].generated).toBe(false);
      expect(columns[3].generated).toBe(true);
    });

    it("embeds a BksField on every column", () => {
      for (const col of columns) {
        expect(col.bksField).toEqual({ name: col.columnName, bksType: "UNKNOWN" });
      }
    });
  });
});
