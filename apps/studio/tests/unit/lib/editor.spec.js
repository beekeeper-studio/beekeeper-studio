import {
  makeDBHint,
  parseDBHintTable,
  parseDBHintTables,
  queryTable,
  findTablesBySchema,
  pushTablesToResult,
} from "../../../src/lib/editor";
import { tableOrViews } from "../../fixtures/tables";
import { PostgresData } from "../../../../../shared/src/lib/dialects/postgresql";

const dialectData = PostgresData;

describe("lib/editor", () => {
  let dbHint;

  beforeAll(() => {
    dbHint = makeDBHint(tableOrViews, dialectData);
  });

  describe("makeDBHint", () => {
    it("should make arrays of tables and schemas", () => {
      expect(makeDBHint(tableOrViews, dialectData)).toEqual({
        tables: [
          { name: "my_table", schema: "public" },
          { name: '"special+table"', schema: "public" },
          { name: "cache_inval_bgw_job", schema: "_timescaledb_cache" },
        ],
        schemas: ["public", "_timescaledb_cache"],
      });
    });

    it("should return empty array when there is no table or schema", () => {
      expect(makeDBHint([], dialectData)).toEqual({ tables: [], schemas: [] });
      expect(makeDBHint([{ name: "my_table" }], dialectData)).toEqual({
        tables: [{ name: "my_table" }],
        schemas: [],
      });
    });
  });

  describe("parseDBHintTables", () => {
    it("should parse tables for addMatches() wordList", () => {
      const wordList = parseDBHintTables(dbHint.tables);
      expect(wordList).toEqual({
        MY_TABLE: { text: "my_table", type: "table", schema: "public" },
        '"SPECIAL+TABLE"': {
          text: '"special+table"',
          type: "table",
          schema: "public",
        },
        CACHE_INVAL_BGW_JOB: {
          text: "cache_inval_bgw_job",
          type: "table",
          schema: "_timescaledb_cache",
        },
      });
    });
  });

  describe("parseDBHintTable", () => {
    it("should parse one table", () => {
      expect(parseDBHintTable(dbHint.tables[0])).toEqual({
        text: "my_table",
        type: "table",
        schema: "public",
      });
    });
  });

  describe("findTablesBySchema", () => {
    it("should find tables by schema", () => {
      const tables = findTablesBySchema("_timescaledb_cache", dbHint.tables);
      expect(tables).toEqual([
        {
          name: "cache_inval_bgw_job",
          schema: "_timescaledb_cache",
        },
      ]);
    });
  });

  describe("pushTablesToResult", () => {
    it("should mutably push tables to result (like addMatches)", () => {
      const tables = [
        {
          name: "my_table",
          schema: "public",
        },
      ];
      const result = [];
      pushTablesToResult(tables, result);
      expect(result).toEqual([
        {
          text: "public.my_table",
          displayText: "my_table",
        },
      ]);
    });
  });

  describe("queryTable", () => {
    it("should query a table", () => {
      expect(queryTable("my_table", dbHint.tables)).toEqual({
        name: "my_table",
        schema: "public",
      });
      expect(queryTable("public.my_table", dbHint.tables)).toEqual({
        name: "my_table",
        schema: "public",
      });
    });

    it("should query a table inside quotes", () => {
      expect(queryTable('"special+table"', tableOrViews)).toMatchObject({
        name: 'special+table',
        schema: "public",
      });
      expect(queryTable('public."special+table"', tableOrViews)).toMatchObject({
        name: 'special+table',
        schema: "public",
      });
    });
  });
});
