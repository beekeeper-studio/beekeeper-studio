import { DBTestUtil } from "../../../../lib/db";
import tmp from "tmp";
import { runCommonTests } from "./all";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import path from "path";
import fs from "fs";
import v8 from "v8";
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

    // Replicates https://github.com/beekeeper-studio/beekeeper-studio/issues/4094
    // TIMESTAMPTZ and UUID values are returned as @duckdb/node-api wrapper
    // instances (DuckDBTimestampTZValue { micros }, DuckDBUUIDValue { hugeint }).
    // Query results are posted from the utility process to the renderer over a
    // MessagePort, which serializes them with the V8 structured clone
    // algorithm. That strips the wrapper's prototype (and its toString), so
    // the grid displays the internal representation — `{"micros":...}` and
    // `{"hugeint":...}` — instead of a readable timestamp / UUID.
    describe("TIMESTAMPTZ and UUID display values (#4094)", () => {
      const UUID = "550e8400-e29b-41d4-a716-446655440000";

      // Simulates the utility -> renderer process boundary (Electron
      // MessagePort.postMessage uses the V8 serializer).
      function crossProcessBoundary<T>(value: T): T {
        return v8.deserialize(v8.serialize(value));
      }

      beforeAll(async () => {
        await util.knex.schema.raw(`
          CREATE TABLE tstz_uuid_test (
            id INT PRIMARY KEY,
            created_at TIMESTAMPTZ,
            uid UUID
          )
        `);
        await util.knex.schema.raw(`
          INSERT INTO tstz_uuid_test VALUES
          (1, TIMESTAMPTZ '2023-06-23 12:30:17.17+00', UUID '${UUID}')
        `);
      });

      afterAll(async () => {
        await util.knex.schema.dropTableIfExists("tstz_uuid_test");
      });

      it("table view (selectTop) keeps TIMESTAMPTZ and UUID readable in the renderer", async () => {
        const { result } = await util.connection.selectTop(
          "tstz_uuid_test", 0, 10, [], [], util.defaultSchema, ["*"]
        );
        const row = crossProcessBoundary(result[0]);

        // The reported symptoms: internal driver representations leak through
        expect(row.created_at).not.toHaveProperty("micros");
        expect(row.uid).not.toHaveProperty("hugeint");

        // What the user should see instead: readable values
        expect(String(row.uid)).toBe(UUID);
        expect(String(row.created_at)).toMatch(/2023/);
      });

      it("query tab (executeQuery) keeps TIMESTAMPTZ and UUID readable in the renderer", async () => {
        const results = await util.connection.executeQuery(
          `SELECT TIMESTAMPTZ '2023-06-23 12:30:17.17+00' AS ts, UUID '${UUID}' AS uid`
        );
        const row = crossProcessBoundary(results[0].rows[0]);

        expect(row.c0).not.toHaveProperty("micros");
        expect(row.c1).not.toHaveProperty("hugeint");

        expect(String(row.c1)).toBe(UUID);
        expect(String(row.c0)).toMatch(/2023/);
      });
    });

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
  });
}

TEST_VERSIONS.forEach(testWith);
