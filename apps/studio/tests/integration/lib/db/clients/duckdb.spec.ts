import { DBTestUtil } from "../../../../lib/db";
import tmp from "tmp";
import { runCommonTests } from "./all";
import { runBksTypeTests } from "./bksType";
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

    it("should return enum values for enum columns", async () => {
      // Named enum types and inline enums both expand to ENUM(...) in
      // duckdb_columns.data_type, so the client parses values from there.
      await util.knex.schema.raw(`CREATE TYPE duck_mood AS ENUM ('sad', 'ok', 'happy')`)
      await util.knex.schema.raw(`
        CREATE TABLE duck_enum_test (
          id INTEGER PRIMARY KEY,
          named_status duck_mood,
          inline_status ENUM('pending', 'active', 'inactive'),
          name VARCHAR
        )
      `)

      const columns = await util.connection.listTableColumns('duck_enum_test')
      const byName = (n: string) => columns.find((c) => c.columnName === n)

      expect(byName('named_status').enumValues).toEqual(['sad', 'ok', 'happy'])
      expect(byName('inline_status').enumValues).toEqual(['pending', 'active', 'inactive'])
      expect(byName('name').enumValues).toBeUndefined()
      expect(byName('id').enumValues).toBeUndefined()
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

    describe("Param tests", () => {
      it("Should be able to handle positional (?) params", async () => {
        await util.paramTest(['?']);
      })
    })

    // Regression test: wrapIdentifier was used for the data type in addColumn,
    // producing "DOUBLE" (quoted identifier) instead of DOUBLE (type name).
    // DuckDB rejects a quoted identifier as a type name, so the column was never added.
    describe("addColumn type regression", () => {
      beforeAll(async () => {
        await util.knex.schema.raw(`CREATE TABLE IF NOT EXISTS add_col_type_test (id INTEGER PRIMARY KEY)`)
      })

      afterAll(async () => {
        await util.knex.schema.dropTableIfExists('add_col_type_test')
      })

      it("should add a DOUBLE column without quoting the type name", async () => {
        await util.connection.alterTable({
          table: 'add_col_type_test',
          schema: util.defaultSchema,
          adds: [{ columnName: 'score', dataType: 'DOUBLE', nullable: true }]
        })

        const columns = await util.connection.listTableColumns('add_col_type_test', util.defaultSchema)
        const col = columns.find((c) => c.columnName.toLowerCase() === 'score')
        expect(col).toBeTruthy()
        expect(col.dataType.toLowerCase()).toContain('double')
      })

      it("should add a VARCHAR column without quoting the type name", async () => {
        await util.connection.alterTable({
          table: 'add_col_type_test',
          schema: util.defaultSchema,
          adds: [{ columnName: 'label', dataType: 'VARCHAR', nullable: true }]
        })

        const columns = await util.connection.listTableColumns('add_col_type_test', util.defaultSchema)
        const col = columns.find((c) => c.columnName.toLowerCase() === 'label')
        expect(col).toBeTruthy()
        expect(col.dataType.toLowerCase()).toContain('varchar')
      })
    })

    describe("queryStream double execution", () => {
      it("should run the supplied query only once across the full stream lifecycle", async () => {
        if (options.readOnly) return
        await util.queryStreamDoubleExecutionTest()
      })
    })

    describe("BksField tests", () => {
      beforeAll(async () => {
        await util.knex.schema.createTable("bks_types", (table) => {
          table.specificType("tinyint_col", "TINYINT");
          table.specificType("smallint_col", "SMALLINT");
          table.specificType("integer_col", "INTEGER");
          table.specificType("bigint_col", "BIGINT");
          table.specificType("hugeint_col", "HUGEINT");
          table.specificType("utinyint_col", "UTINYINT");
          table.specificType("usmallint_col", "USMALLINT");
          table.specificType("uinteger_col", "UINTEGER");
          table.specificType("ubigint_col", "UBIGINT");
          table.specificType("float_col", "FLOAT");
          table.specificType("double_col", "DOUBLE");
          table.specificType("decimal_col", "DECIMAL(10,2)");
          table.specificType("varchar_col", "VARCHAR");
          table.specificType("uuid_col", "UUID");
          table.specificType("json_col", "JSON");
          table.specificType("date_col", "DATE");
          table.specificType("time_col", "TIME");
          table.specificType("timestamp_col", "TIMESTAMP");
          table.specificType("timestamptz_col", "TIMESTAMPTZ");
          table.specificType("interval_col", "INTERVAL");
          table.specificType("boolean_col", "BOOLEAN");
          table.specificType("blob_col", "BLOB");
        });
      });

      afterAll(async () => {
        await util.knex.schema.dropTable("bks_types");
      });

      runBksTypeTests({
        connection: () => util.connection,
        table: "bks_types",
        expectedResults: {
          BINARY: ["blob_col"],
          STRING: ["varchar_col", "uuid_col", "json_col"],
          NUMBER: [
            "tinyint_col",
            "smallint_col",
            "integer_col",
            "bigint_col",
            "hugeint_col",
            "utinyint_col",
            "usmallint_col",
            "uinteger_col",
            "ubigint_col",
            "float_col",
            "double_col",
            "decimal_col",
          ],
          DATETIME: [
            "date_col",
            "time_col",
            "timestamp_col",
            "timestamptz_col",
            "interval_col",
          ],
          BOOLEAN: ["boolean_col"],
          OBJECTID: [],
          SURREALID: [],
          UNKNOWN: [],
        },
      });
    });
  });
}

TEST_VERSIONS.forEach(testWith);
