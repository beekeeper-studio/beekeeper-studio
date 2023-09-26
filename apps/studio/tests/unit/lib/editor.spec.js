import {
  makeDBHint,
  queryTable,
  findTablesBySchema,
  splitSchemaTable,
  findTableOrViewByWord,
  getTextNearCursor,
  splitWords,
} from "../../../src/lib/editor";
import {
  postgresDBHint,
  mysqlDBHint,
  sqliteDBHint,
  tables,
  tablesWithoutSchema,
  sqlServerDBHint,
} from "../../fixtures/tables";
import { PostgresData } from "../../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../../shared/src/lib/dialects/sqlite";
import { SqlServerData } from "../../../../../shared/src/lib/dialects/sqlserver";
import { MysqlData } from "../../../../../shared/src/lib/dialects/mysql";

describe("lib/editor", () => {
  describe("makeDBHint (DB with schemas)", () => {
    it("should make arrays of tables and schemas", () => {
      expect(
        makeDBHint([{ name: "my_table" }], PostgresData, "public")
      ).toMatchObject({
        defaultTableWordList: {
          my_table: { name: "my_table", schema: "public" },
        },
        tableWords: [{ name: "my_table", schema: "public" }],
        schemaWordList: {
          public: { name: "public" },
        },
      });
      expect(makeDBHint(tables, PostgresData, "public")).toEqual(
        postgresDBHint
      );
      expect(makeDBHint(tables, SqlServerData, "public")).toEqual(
        sqlServerDBHint
      );
    });

    it("should return empty array of tables or schemas", () => {
      expect(makeDBHint([], PostgresData, "public")).toMatchObject({
        defaultTableWordList: {},
        tableWords: [],
        schemaWordList: {
          public: { name: "public" },
        },
      });
    });

    it("should be based on default schema", () => {
      expect(
        makeDBHint([{ name: "my_table" }], SqlServerData, "dbo")
      ).toMatchObject({
        defaultTableWordList: {
          my_table: { name: "my_table", schema: "dbo" },
        },
        tableWords: [{ name: "my_table", schema: "dbo" }],
        schemaWordList: {
          dbo: { name: "dbo" },
        },
      });
    });
  });

  describe("makeDBHint (DB without schemas)", () => {
    it("should make arrays of tables and schemas", () => {
      expect(makeDBHint(tablesWithoutSchema, SqliteData)).toEqual(sqliteDBHint);
      expect(makeDBHint(tablesWithoutSchema, MysqlData)).toEqual(mysqlDBHint);
    });

    it("should return empty array of tables and schemas", () => {
      expect(makeDBHint([], SqliteData)).toMatchObject({
        defaultTableWordList: {},
        tableWords: [],
        schemaWordList: {},
      });
      expect(makeDBHint([{ name: "my_table" }], SqliteData)).toMatchObject({
        defaultTableWordList: {
          my_table: { name: "my_table", schema: undefined },
        },
        tableWords: [{ name: "my_table", schema: undefined }],
        schemaWordList: {},
      });
    });
  });

  describe("findTablesBySchema", () => {
    it("should find tables by schema", () => {
      expect(
        findTablesBySchema(postgresDBHint, "_timescaledb_cache")
      ).toMatchObject([
        {
          name: "my_table",
          schema: "_timescaledb_cache",
        },
        {
          name: "cache_inval_bgw_job",
          schema: "_timescaledb_cache",
        },
      ]);
      expect(
        findTablesBySchema(postgresDBHint, "schema with spaces")
      ).toMatchObject([
        {
          name: "testtable",
          schema: "schema with spaces",
        },
      ]);
    });
  });

  describe("findTableOrViewByWord", () => {
    it("should find a tableOrView by word (with schema)", () => {
      const tableWord = queryTable(postgresDBHint, "my_table");
      expect(findTableOrViewByWord(tables, tableWord)).toMatchObject({
        name: "my_table",
      });
    });

    it("should find a tableOrView by word (without schema)", () => {
      const tableWord = queryTable(sqliteDBHint, "my_table");
      expect(
        findTableOrViewByWord(tablesWithoutSchema, tableWord)
      ).toMatchObject({
        name: "my_table",
      });
    });
  });

  describe("queryTable", () => {
    it("should query a table", () => {
      expect(queryTable(postgresDBHint, "my_table")).toMatchObject({
        name: "my_table",
        schema: "public",
      });
      expect(queryTable(postgresDBHint, '"special+table"')).toMatchObject({
        name: "special+table",
        schema: "public",
      });
      expect(
        queryTable(postgresDBHint, "_timescaledb_cache.my_table")
      ).toMatchObject({
        name: "my_table",
        schema: "_timescaledb_cache",
      });
      expect(
        queryTable(postgresDBHint, 'public."special+table"')
      ).toMatchObject({
        name: "special+table",
        text: "special+table",
        schema: "public",
      });
      expect(
        queryTable(postgresDBHint, '"schema with spaces".testtable')
      ).toMatchObject({
        name: "testtable",
        schema: "schema with spaces",
      });
    });

    it("should query a mixed case table", () => {
      expect(queryTable(postgresDBHint, "MixedCase")).toMatchObject({
        name: "MixedCase",
        text: "MixedCase",
        schema: "public",
      });
    });

    it("should query a table with quotations", () => {
      const sqlite = sqliteDBHint;
      const postgres = postgresDBHint;
      const sqlserver = makeDBHint(
        [{ name: "my_table" }],
        SqlServerData,
        "dbo"
      );
      const mysql = makeDBHint([{ name: "my_table" }], MysqlData);

      expect(queryTable(sqlite, "`my_table`")).toBeTruthy();
      expect(queryTable(sqlite, "'my_table'")).toBeTruthy();
      expect(queryTable(sqlite, '"my_table"')).toBeTruthy();

      expect(queryTable(postgres, "`my_table`")).toBeFalsy();
      expect(queryTable(postgres, "'my_table'")).toBeFalsy();
      expect(queryTable(postgres, '"my_table"')).toBeTruthy();
      expect(queryTable(postgres, '"public"."my_table"')).toBeTruthy();
      expect(queryTable(postgres, '"public".my_table')).toBeTruthy();
      expect(queryTable(postgres, 'public."my_table"')).toBeTruthy();

      expect(queryTable(sqlserver, "`my_table`")).toBeFalsy();
      expect(queryTable(sqlserver, "'my_table'")).toBeFalsy();
      expect(queryTable(sqlserver, '"my_table"')).toBeTruthy();

      expect(queryTable(mysql, "`my_table`")).toBeTruthy();
      expect(queryTable(mysql, "'my_table'")).toBeFalsy();
      expect(queryTable(mysql, '"my_table"')).toBeFalsy();
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
        '"my schema".my_table': ['"my schema"', "my_table"],
      };
      Object.keys(schemaTables).forEach((schemaTable) => {
        expect(splitSchemaTable(schemaTable)).toEqual(
          schemaTables[schemaTable]
        );
      });
    });
  });

  describe("getTextNearCursor", () => {
    /** Mock editor and cursor of codemirror. `|` is represented as the cursor position. */
    function editorOf(text) {
      return {
        editor: {
          display: { view: [{ line: { text: text.replace(/\|/g, "") } }] },
        },
        cursor: { line: 0, ch: text.indexOf("|") },
      };
    }

    it("should capture a text near the cursor", () => {
      const e1 = editorOf("SELECT * FROM public.|");
      expect(getTextNearCursor(e1.editor, e1.cursor)).toEqual({
        text: "public.",
        startAt: 14,
      });

      const e2 = editorOf("SELECT `any alias`| FROM testtable as");
      expect(getTextNearCursor(e2.editor, e2.cursor)).toEqual({
        text: "`any alias`",
        startAt: 7,
      });
    });
  });

  describe("separateWords", () => {
    it("should separate a text into words", () => {
      expect(splitWords("FROM public.table")).toEqual(["FROM", "public.table"]);
      expect(splitWords("FROM `my table` AS t")).toEqual([
        "FROM",
        "`my table`",
        "AS",
        "t",
      ]);
    });
  });
});
