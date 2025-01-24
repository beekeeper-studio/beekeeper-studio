import { DBTestUtil } from "../../../../lib/db";
import tmp from "tmp";
import { runCommonTests } from "./all";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import path from "path";
import fs from "fs";
import _ from "lodash";

const TEST_VERSIONS = [
  { mode: 'file', readOnly: false },
  { mode: 'file', readOnly: true },
  { mode: 'memory', readOnly: false },
];

function testWith(options: typeof TEST_VERSIONS[number]) {
  describe(`DuckDB [${options.mode} - read-only mode? ${options.readOnly}]`, () => {
    let dbfile: any;
    let dbdir: any;
    let filepath: string;
    let util: DBTestUtil;

    beforeAll(async () => {
      dbdir = tmp.dirSync();
      filepath = path.join(dbdir.name, "duckdb.db");

      // @ts-ignore
      const config: IDbConnectionServerConfig = {
        client: "duckdb",
      };

      const dbOptions: DBTestUtil["options"] = {
        dialect: "duckdb",
        defaultSchema: "main",

        // There should be only one process that can both read and write to
        // the database.
        singleClient: true,

        // DuckDB supports generated columns, but there's no specific
        // information whether a column is generated or not. Be aware that we
        // can get the definition of it from the default value.
        skipGeneratedColumns: true,
      };

      util = new DBTestUtil(
        config,
        options.mode === 'memory' ? ':memory:' : filepath,
        dbOptions
      );
      await util.setupdb();
    });

    afterAll(async () => {
      if (util.connection) {
        await util.connection.disconnect();
      }
      if (dbfile) {
        dbfile.removeCallback();
      }
      if (dbdir) {
        // @ts-expect-error not fully typed
        fs.rmSync(dbdir.name, { recursive: true, force: true });
      }
    });

    describe("Common Tests", () => {
      runCommonTests(() => util);
    });

    it("should parse all binary columns", async () => {
      await util.knex.raw(`
        CREATE TABLE binary_data_types (
            id INT PRIMARY KEY,
            blob BLOB,
            blob_alias BYTEA,               -- alias of BLOB
            blob_alias2 BINARY,             -- alias of BLOB
            blob_alias3 VARBINARY           -- alias of BLOB
        );
      `);

      const expectedBksFields = [
        { name: 'id', bksType: 'UNKNOWN' },
        { name: 'blob', bksType: 'BINARY' },
        { name: 'blob_alias', bksType: 'BINARY' },
        { name: 'blob_alias2', bksType: 'BINARY' },
        { name: 'blob_alias3', bksType: 'BINARY' },
      ]

      const columns = await util.connection.listTableColumns('binary_data_types')
      expect(columns.map((c) => c.bksField)).toStrictEqual(expectedBksFields)

      const { fields } = await util.connection.selectTop('binary_data_types', 0, 10, [], [], util.defaultSchema, ["*"])
      expect(fields).toStrictEqual(expectedBksFields)
    })

    describe("Index Tests", () => {
      beforeAll(async () => {
        await util.knex.schema.raw(
          "CREATE TABLE list_all_idx_test (a INT, b INT, c INT UNIQUE, PRIMARY KEY (a, b))"
        );
        await util.knex.schema.raw(
          "CREATE TABLE col_exp_test (a int, b int, c int)"
        );
      });

      afterAll(async () => {
        await util.knex.schema.dropTableIfExists("list_all_idx_test");
        await util.knex.schema.dropTableIfExists("col_exp_test");
      });

      it("should be able to create index sql with columns as expressions correctly", async () => {
        const sql = await util.connection.alterIndexSql({
          additions: [
            {
              name: "col_exp_test_idx",
              columns: [{ name: "a" }, { name: "(b + c)" }],
              unique: true,
            },
          ],
          drops: [],
          table: "col_exp_test",
        });
        expect(sql).toBe(
          `CREATE UNIQUE INDEX "col_exp_test_idx" ON "col_exp_test" ("a",(b + c))`
        );
      });

      it("should be able to list columns and expressions of an index", async () => {
        await util.knex.schema.raw(
          "CREATE INDEX col_exp_test_idx ON col_exp_test (a, (b + c), (a * (b - c)))"
        );

        const indexes = await util.connection.listTableIndexes("col_exp_test");
        expect(indexes[0].columns).toEqual([
          { name: "a" },
          { name: "((b + c))" },
          { name: "((a * (b - c)))" },
        ]);

        await util.knex.schema.raw("DROP INDEX col_exp_test_idx");
      });
    });
  });
}

TEST_VERSIONS.forEach(testWith);
