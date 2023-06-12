import {
  makeDBHint,
  queryTable,
  findTablesBySchema,
  findWord,
  splitSchemaTable,
} from "../../../src/lib/editor";
import { dbHint, tableOrViews } from "../../fixtures/tables";
import { PostgresData } from "../../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../../shared/src/lib/dialects/sqlite";
import { SqlServerData } from "../../../../../shared/src/lib/dialects/sqlserver";

describe("lib/editor", () => {
  describe("makeDBHint (DB with schemas)", () => {
    const dialectData = PostgresData;
    const defaultSchema = "public";

    it("should make arrays of tables and schemas", () => {
      expect(makeDBHint(tableOrViews, dialectData, defaultSchema)).toEqual(
        dbHint
      );
    });

    it("should return empty array of tables or schemas", () => {
      expect(makeDBHint([], dialectData, defaultSchema)).toMatchObject({
        tableWordList: {},
        tableWords: [],
        schemaWordList: {
          public: { name: "public" },
        },
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toMatchObject({
        tableWordList: {
          my_table: {
            name: "my_table",
            schema: "public",
          },
        },
        tableWords: [
          {
            name: "my_table",
            schema: "public",
          },
        ],
        schemaWordList: {
          public: { name: "public" },
        },
      });
    });

    it("should be based on default schema", () => {
      expect(
        makeDBHint([{ name: "my_table" }], SqlServerData, "dbo")
      ).toMatchObject({
        tableWordList: {
          my_table: {
            name: "my_table",
            schema: "dbo",
          },
        },
        tableWords: [
          {
            name: "my_table",
            schema: "dbo",
          },
        ],
        schemaWordList: {
          dbo: { name: "dbo" },
        },
      });
    });
  });

  describe("makeDBHint (DB without schemas)", () => {
    const dialectData = SqliteData;
    const defaultSchema = null;

    it("should return empty array of tables and schemas", () => {
      expect(makeDBHint([], dialectData, defaultSchema)).toEqual({
        tableWordList: {},
        tableWords: [],
        schemaWordList: {},
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toMatchObject({
        tableWordList: {
          my_table: { name: "my_table", schema: undefined },
        },
        tableWords: [{ name: "my_table", schema: undefined }],
        schemaWordList: {},
      });
    });
  });

  describe("findTablesBySchema", () => {
    it("should find tables by schema", () => {
      const tables = findTablesBySchema(dbHint, "_timescaledb_cache");
      expect(tables).toMatchObject([
        {
          name: "my_table",
          schema: "_timescaledb_cache",
        },
        {
          name: "cache_inval_bgw_job",
          schema: "_timescaledb_cache",
        },
      ]);
    });
  });

  describe("queryTable", () => {
    it("should query a table", () => {
      expect(queryTable(dbHint, "my_table")).toMatchObject({
        name: "my_table",
        schema: "public",
      });
      expect(queryTable(dbHint, "public.my_table")).toMatchObject({
        name: "my_table",
        schema: "public",
      });
      expect(queryTable(dbHint, "_timescaledb_cache.my_table")).toMatchObject({
        name: "my_table",
        schema: "_timescaledb_cache",
      });
    });

    it("should query a table with special characters", () => {
      expect(queryTable(dbHint, '"special+table"')).toMatchObject({
        name: "special+table",
        text: '"special+table"',
        schema: "public",
      });
      expect(queryTable(dbHint, 'public."special+table"')).toMatchObject({
        name: "special+table",
        text: '"special+table"',
        schema: "public",
      });
    });

    it("should query a case sensitive table", () => {
      expect(queryTable(dbHint, "CASE_SENSITIVE_table")).toMatchObject({
        name: "CASE_SENSITIVE_table",
        text: '"CASE_SENSITIVE_table"',
        schema: "public",
      });
      expect(queryTable(dbHint, "CASE_sensitive_table")).toMatchObject({
        name: "CASE_sensitive_table",
        text: '"CASE_sensitive_table"',
        schema: "public",
      });
    });
  });

  describe("findWord", () => {
    it("should find a word object in a wordList by the key", () => {
      expect(findWord(dbHint.tableWordList, "my_table")).toMatchObject({
        name: "my_table",
      });
    });
  });

  describe("splitSchemaTable", () => {
    it("should split schema and table from a string correctly", () => {
      const schemaTables = {
        "public.my_table": ["public", "my_table"],
        "public.`my_table`": ["public", "`my_table`"],
        "public.'my_table'": ["public", "'my_table'"],
        'public."my.table"': ["public", '"my.table"'],
        '"public"."my.table"': ['"public"', '"my.table"'],
      };
      Object.keys(schemaTables).forEach((schemaTable) => {
        expect(splitSchemaTable(schemaTable)).toEqual(
          schemaTables[schemaTable]
        );
      });
    });
  });
});
