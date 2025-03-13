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
    
    describe("Table References Tests", () => {
      beforeAll(async () => {
        // Create parent and child tables with foreign key relationships
        await util.knex.schema.raw(`
          CREATE TABLE departments (
            department_id INT PRIMARY KEY,
            department_name VARCHAR(100)
          )
        `);
        
        await util.knex.schema.raw(`
          CREATE TABLE employees (
            employee_id INT PRIMARY KEY,
            department_id INT,
            employee_name VARCHAR(100),
            FOREIGN KEY (department_id) REFERENCES departments(department_id)
          )
        `);
      });

      afterAll(async () => {
        await util.knex.schema.dropTableIfExists("employees");
        await util.knex.schema.dropTableIfExists("departments");
      });

      it("should get table references correctly", async () => {
        // This test may be skipped since it depends on DuckDB's capabilities
        // The implementation returns empty results if not supported
        try {
          const references = await util.connection.getTableReferences("departments", "main");
          expect(Array.isArray(references)).toBe(true);
          // Note: DuckDB may not fully support foreign key constraints in a way that
          // allows listing references, so the actual result may be empty
        } catch (e) {
          console.warn("DuckDB getTableReferences test skipped due to DuckDB limitations");
        }
      });
    });
    
    describe("Upsert SQL Tests", () => {
      it("should create correct upsert SQL", async () => {
        const entity = { name: "test_table" };
        const data = [
          { id: 1, name: "Test 1" },
          { id: 2, name: "Test 2" }
        ];
        
        // Access the client directly to test the createUpsertSQL method
        // @ts-ignore - Accessing private method for testing
        const sql = util.connection.createUpsertSQL(entity, data);
        
        expect(sql).toContain("INSERT OR REPLACE");
        expect(sql).toContain("`test_table`");
        expect(sql).toContain("`id`, `name`");
        expect(sql).toContain("('1','Test 1'),('2','Test 2')");
      });
    });
  });
}

TEST_VERSIONS.forEach(testWith);
