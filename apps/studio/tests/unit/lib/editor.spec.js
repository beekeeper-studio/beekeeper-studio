import {
  makeDBHint,
  queryTable,
  findTablesBySchema,
  splitSchemaTable,
  findTableOrViewByWord,
} from "../../../src/lib/editor";
import {
  dbHint,
  dbHintWithoutSchema,
  tableOrViews,
  tableOrViewsWithoutSchema,
} from "../../fixtures/tables";
import { PostgresData } from "../../../../../shared/src/lib/dialects/postgresql";
import { SqliteData } from "../../../../../shared/src/lib/dialects/sqlite";
import { SqlServerData } from "../../../../../shared/src/lib/dialects/sqlserver";
import { MysqlData } from "../../../../../shared/src/lib/dialects/mysql";

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
        defaultTableWordList: {},
        tableWords: [],
        schemaWordList: {
          public: { name: "public" },
        },
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toMatchObject({
        defaultTableWordList: {
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
        defaultTableWordList: {
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

    it("should make arrays of tables and schemas", () => {
      expect(
        makeDBHint(tableOrViewsWithoutSchema, dialectData, defaultSchema)
      ).toEqual(dbHintWithoutSchema);
    });

    it("should return empty array of tables and schemas", () => {
      expect(makeDBHint([], dialectData, defaultSchema)).toMatchObject({
        defaultTableWordList: {},
        tableWords: [],
        schemaWordList: {},
      });
      expect(
        makeDBHint([{ name: "my_table" }], dialectData, defaultSchema)
      ).toMatchObject({
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

  describe("findTableOrViewByWord", () => {
    it("should find a tableOrView by word (with schema)", () => {
      const tableWord = queryTable(dbHint, "my_table");
      expect(findTableOrViewByWord(tableOrViews, tableWord)).toMatchObject({
        name: "my_table",
      });
    });

    it("should find a tableOrView by word (without schema)", () => {
      const tableWord = queryTable(dbHintWithoutSchema, "my_table");
      expect(
        findTableOrViewByWord(tableOrViewsWithoutSchema, tableWord)
      ).toMatchObject({
        name: "my_table",
      });
    });
  });

  describe("queryTable", () => {
    it("should query a table", () => {
      expect(queryTable(dbHint, "my_table")).toMatchObject({
        name: "my_table",
        schema: "public",
      });
      expect(queryTable(dbHint, '"special+table"')).toMatchObject({
        name: "special+table",
        schema: "public",
      });
      expect(queryTable(dbHint, '_timescaledb_cache.my_table')).toMatchObject(
        {
          name: "my_table",
          schema: "_timescaledb_cache",
        }
      );
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

    it("should query a table with quotations", () => {
      const sqlite = dbHintWithoutSchema;
      const postgres = dbHint;
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
      };
      Object.keys(schemaTables).forEach((schemaTable) => {
        expect(splitSchemaTable(schemaTable)).toEqual(
          schemaTables[schemaTable]
        );
      });
    });
  });
});
