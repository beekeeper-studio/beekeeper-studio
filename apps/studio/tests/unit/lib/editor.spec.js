import {
  makeDBHint,
  queryTable,
  findTablesBySchema,
  findWord,
} from "../../../src/lib/editor";
import { dbHint, tableOrViews } from "../../fixtures/tables";
import { PostgresData } from "../../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../../shared/src/lib/dialects/sqlite";

describe("lib/editor", () => {
  describe("makeDBHint (DB with schemas))", () => {
    const dialectData = PostgresData;
    const defaultSchema = "public";

    it("should make arrays of tables and schemas", () => {
      expect(makeDBHint(tableOrViews, dialectData, defaultSchema)).toEqual(
        dbHint
      );
    });

    it("should return empty array of tables or schemas", () => {
      expect(makeDBHint([], dialectData, defaultSchema)).toEqual({
        tableWordList: {},
        tableWords: [],
        schemaWordList: {
          PUBLIC: {
            name: "public",
            text: "public",
            type: "schema",
          },
        },
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toEqual({
        tableWordList: {
          MY_TABLE: {
            name: "my_table",
            text: "my_table",
            type: "table",
            schema: "public",
          },
        },
        tableWords: [
          {
            name: "my_table",
            text: "my_table",
            type: "table",
            schema: "public",
          },
        ],
        schemaWordList: {
          PUBLIC: {
            name: "public",
            text: "public",
            type: "schema",
          },
        },
      });
    });
  });

  describe("makeDBHint (DB without schemas))", () => {
    const dialectData = SqliteData;
    const defaultSchema = undefined;

    it("should return empty array of tables and schemas", () => {
      expect(makeDBHint([], dialectData, defaultSchema)).toEqual({
        tableWordList: {},
        tableWords: [],
        schemaWordList: {},
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toEqual({
        tableWordList: {
          MY_TABLE: {
            name: "my_table",
            text: "my_table",
            type: "table",
          },
        },
        tableWords: [
          {
            name: "my_table",
            text: "my_table",
            type: "table",
          },
        ],
        schemaWordList: {},
      });
    });
  });

  describe("findTablesBySchema", () => {
    it("should find tables by schema", () => {
      const tables = findTablesBySchema(dbHint, "_timescaledb_cache");
      expect(tables).toEqual([
        {
          name: "cache_inval_bgw_job",
          text: "cache_inval_bgw_job",
          type: "table",
          schema: "_timescaledb_cache",
        },
      ]);
    });
  });

  describe("queryTable", () => {
    it("should query a table", () => {
      expect(queryTable(dbHint, "my_table")).toEqual({
        name: "my_table",
        text: "my_table",
        type: "table",
        schema: "public",
      });
      expect(queryTable(dbHint, "public.my_table")).toEqual({
        name: "my_table",
        text: "my_table",
        type: "table",
        schema: "public",
      });
    });

    it("should query a table inside quotes", () => {
      expect(queryTable(dbHint, '"special+table"')).toMatchObject({
        name: "special+table",
        text: '"special+table"',
        type: "table",
        schema: "public",
      });
      expect(queryTable(dbHint, 'public."special+table"')).toMatchObject({
        name: "special+table",
        text: '"special+table"',
        type: "table",
        schema: "public",
      });
    });
  });

  describe("findWord", () => {
    it("should find a word object in a wordList by the key", () => {
      expect(findWord(dbHint.tableWordList, "my_table").name).toBe("my_table");
    });
  });
});
