import { DBTestUtil } from "../../../../lib/db";
import { HanaTestDriver, HANA_STARTUP_TIMEOUT } from "./hana/container";
import { TableOrView } from "@/lib/db/models";

const SCHEMA = "BKTEST";

const SEED_STATEMENTS = [
  `CREATE SCHEMA "${SCHEMA}"`,
  `CREATE COLUMN TABLE "${SCHEMA}"."addresses" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "street" NVARCHAR(255),
    "city" NVARCHAR(255),
    "country" NVARCHAR(255) NOT NULL
  )`,
  `CREATE COLUMN TABLE "${SCHEMA}"."people" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "email" NVARCHAR(255) NOT NULL,
    "address_id" INTEGER,
    "created_at" TIMESTAMP,
    "photo" VARBINARY(1000),
    CONSTRAINT "fk_people_address" FOREIGN KEY ("address_id") REFERENCES "${SCHEMA}"."addresses" ("id")
  )`,
  `CREATE COLUMN TABLE "${SCHEMA}"."jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "job_name" NVARCHAR(255) NOT NULL,
    "hourly_rate" DECIMAL(10,2)
  )`,
  `CREATE COLUMN TABLE "${SCHEMA}"."people_jobs" (
    "person_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    PRIMARY KEY ("person_id", "job_id"),
    CONSTRAINT "fk_pj_person" FOREIGN KEY ("person_id") REFERENCES "${SCHEMA}"."people" ("id"),
    CONSTRAINT "fk_pj_job" FOREIGN KEY ("job_id") REFERENCES "${SCHEMA}"."jobs" ("id")
  )`,
  `CREATE INDEX "idx_people_email" ON "${SCHEMA}"."people" ("email")`,
  `CREATE VIEW "${SCHEMA}"."people_view" AS SELECT "id", "email" FROM "${SCHEMA}"."people"`,
  `CREATE TRIGGER "${SCHEMA}"."people_trigger" AFTER INSERT ON "${SCHEMA}"."people" FOR EACH ROW
   BEGIN
     DECLARE dummy INT;
     dummy := 1;
   END`,
  `CREATE PROCEDURE "${SCHEMA}"."test_proc" (IN a INTEGER, OUT b INTEGER) LANGUAGE SQLSCRIPT AS
   BEGIN
     b := :a * 2;
   END`,
  `CREATE FUNCTION "${SCHEMA}"."test_func" () RETURNS r INTEGER LANGUAGE SQLSCRIPT AS
   BEGIN
     r := 42;
   END`,
  `INSERT INTO "${SCHEMA}"."addresses" VALUES (1, 'Main St', 'Springfield', 'US')`,
  `INSERT INTO "${SCHEMA}"."addresses" VALUES (2, 'High St', 'London', 'UK')`,
  `INSERT INTO "${SCHEMA}"."people" ("id", "email", "address_id") VALUES (1, 'a@example.com', 1)`,
  `INSERT INTO "${SCHEMA}"."people" ("id", "email", "address_id") VALUES (2, 'b@example.com', 1)`,
  `INSERT INTO "${SCHEMA}"."people" ("id", "email", "address_id") VALUES (3, 'c@example.com', 2)`,
  `INSERT INTO "${SCHEMA}"."people" ("id", "email", "address_id") VALUES (4, 'd@example.com', 2)`,
  `INSERT INTO "${SCHEMA}"."people" ("id", "email", "address_id") VALUES (5, 'e@example.com', 2)`,
  `INSERT INTO "${SCHEMA}"."jobs" VALUES (1, 'Programmer', 45.50)`,
  `INSERT INTO "${SCHEMA}"."people_jobs" VALUES (1, 1)`,
];

describe("SAP HANA integration tests", () => {
  jest.setTimeout(HANA_STARTUP_TIMEOUT);

  let util: DBTestUtil;

  beforeAll(async () => {
    await HanaTestDriver.start();
    await HanaTestDriver.seed(SEED_STATEMENTS);

    util = new DBTestUtil(HanaTestDriver.config, "HXE", { dialect: 'hana', defaultSchema: SCHEMA });
    await util.connection.connect();
  });

  afterAll(async () => {
    if (util?.connection) {
      await util.connection.disconnect();
    }
    await HanaTestDriver.stop();
  });

  describe("Read operations", () => {
    it("should report the server version", async () => {
      const version = await util.connection.versionString();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d/);
    });

    it("should report the connected user's schema as default schema", async () => {
      const schema = await util.connection.defaultSchema();
      expect(schema).toBe('SYSTEM');
    });

    it("should list schemas including the test schema, excluding system schemas", async () => {
      const schemas = await util.connection.listSchemas();
      expect(schemas).toContain(SCHEMA);
      expect(schemas).not.toContain('SYS');
      expect(schemas.some((s) => s.startsWith('_SYS_'))).toBe(false);
    });

    it("should list databases", async () => {
      const databases = await util.connection.listDatabases();
      expect(Array.isArray(databases)).toBe(true);
      expect(databases.length).toBeGreaterThan(0);
    });

    it("should list tables in the test schema", async () => {
      const tables: TableOrView[] = await util.connection.listTables({ schema: SCHEMA });
      const names = tables.map((t) => t.name);

      expect(names).toContain('people');
      expect(names).toContain('addresses');
      expect(names).toContain('jobs');
      expect(names).toContain('people_jobs');
      tables.forEach((t) => expect(t.schema).toBe(SCHEMA));
    });

    it("should list tables when filter is null (bug #3947)", async () => {
      const tables = await util.connection.listTables(null);
      expect(tables.length).toBeGreaterThanOrEqual(4);
      expect(tables.some((t) => t.schema === 'SYS')).toBe(false);
    });

    it("should list views", async () => {
      const views = await util.connection.listViews({ schema: SCHEMA });
      expect(views.map((v) => v.name)).toContain('people_view');
    });

    it("should list table columns with types and nullability", async () => {
      const columns = await util.connection.listTableColumns('people', SCHEMA);
      const names = columns.map((c) => c.columnName);

      expect(names).toEqual(['id', 'email', 'address_id', 'created_at', 'photo']);

      const email = columns.find((c) => c.columnName === 'email');
      expect(email.dataType).toBe('NVARCHAR(255)');
      expect(email.nullable).toBe(false);
      expect(email.schemaName).toBe(SCHEMA);
      expect(email.tableName).toBe('people');

      const addressId = columns.find((c) => c.columnName === 'address_id');
      expect(addressId.dataType).toBe('INTEGER');
      expect(addressId.nullable).toBe(true);

      const photo = columns.find((c) => c.columnName === 'photo');
      expect(photo.bksField.bksType).toBe('BINARY');

      const rate = (await util.connection.listTableColumns('jobs', SCHEMA))
        .find((c) => c.columnName === 'hourly_rate');
      expect(rate.dataType).toBe('DECIMAL(10,2)');
    });

    it("should list view columns", async () => {
      const columns = await util.connection.listTableColumns('people_view', SCHEMA);
      expect(columns.map((c) => c.columnName)).toEqual(['id', 'email']);
    });

    it("should find a single-column primary key", async () => {
      const keys = await util.connection.getPrimaryKeys('people', SCHEMA);
      expect(keys.length).toBe(1);
      expect(keys[0].columnName).toBe('id');

      const single = await util.connection.getPrimaryKey('people', SCHEMA);
      expect(single).toBe('id');
    });

    it("should find a composite primary key", async () => {
      const keys = await util.connection.getPrimaryKeys('people_jobs', SCHEMA);
      expect(keys.map((k) => k.columnName).sort()).toEqual(['job_id', 'person_id']);

      // getPrimaryKey returns null for composite keys
      const single = await util.connection.getPrimaryKey('people_jobs', SCHEMA);
      expect(single).toBeNull();
    });

    it("should find outgoing foreign keys", async () => {
      const keys = await util.connection.getOutgoingKeys('people', SCHEMA);
      expect(keys.length).toBe(1);
      expect(keys[0].toTable).toBe('addresses');
      expect(keys[0].toColumn).toBe('id');
      expect(keys[0].fromColumn).toBe('address_id');
      expect(keys[0].constraintName).toBe('fk_people_address');
    });

    it("should find incoming foreign keys", async () => {
      const keys = await util.connection.getIncomingKeys('addresses', SCHEMA);
      expect(keys.length).toBe(1);
      expect(keys[0].fromTable).toBe('people');
    });

    it("should find table references", async () => {
      const refs = await util.connection.getTableReferences('people_jobs', SCHEMA);
      expect(refs.sort()).toEqual(['jobs', 'people']);
    });

    it("should list table indexes", async () => {
      const indexes = await util.connection.listTableIndexes('people', SCHEMA);
      const custom = indexes.find((i) => i.name === 'idx_people_email');

      expect(custom).toBeDefined();
      expect(custom.columns.map((c) => c.name)).toEqual(['email']);
      expect(custom.primary).toBe(false);

      const primary = indexes.find((i) => i.primary);
      expect(primary).toBeDefined();
      expect(primary.columns.map((c) => c.name)).toEqual(['id']);
    });

    it("should list table triggers", async () => {
      const triggers = await util.connection.listTableTriggers('people', SCHEMA);
      expect(triggers.length).toBe(1);
      expect(triggers[0].name).toBe('people_trigger');
      expect(triggers[0].timing).toBe('AFTER');
      expect(triggers[0].manipulation).toBe('INSERT');
      expect(triggers[0].table).toBe('people');
    });

    it("should list routines with parameters", async () => {
      const routines = await util.connection.listRoutines({ schema: SCHEMA });
      const names = routines.map((r) => r.name);

      expect(names).toContain('test_proc');
      expect(names).toContain('test_func');

      const proc = routines.find((r) => r.name === 'test_proc');
      expect(proc.type).toBe('procedure');
      expect(proc.routineParams.map((p) => p.name)).toEqual(['A', 'B']);

      const func = routines.find((r) => r.name === 'test_func');
      expect(func.type).toBe('function');
      expect(func.returnType).toBe('INTEGER');
    });
  });

  describe("Table data", () => {
    it("should count table rows", async () => {
      const length = await util.connection.getTableLength('people', SCHEMA);
      expect(Number(length)).toBe(5);
    });

    it("should retrieve data with selectTop", async () => {
      const data = await util.connection.selectTop('people', 0, 100, [], [], SCHEMA, []);
      expect(data.result.length).toBe(5);
      expect(data.fields.length).toBe(5);
    });

    it("should paginate with limit and offset", async () => {
      const firstPage = await util.connection.selectTop('people', 0, 2, [{ field: 'id', dir: 'ASC' }], [], SCHEMA, []);
      expect(firstPage.result.length).toBe(2);

      const secondPage = await util.connection.selectTop('people', 2, 2, [{ field: 'id', dir: 'ASC' }], [], SCHEMA, []);
      expect(secondPage.result.length).toBe(2);
      expect(secondPage.result[0]).not.toEqual(firstPage.result[0]);
    });

    it("should sort descending", async () => {
      const data = await util.connection.selectTop('people', 0, 1, [{ field: 'id', dir: 'DESC' }], [], SCHEMA, ['id', 'email']);
      expect(data.result.length).toBe(1);
      expect(Number(Object.values(data.result[0])[0])).toBe(5);
    });

    it("should filter with structured filters", async () => {
      const data = await util.connection.selectTop('people', 0, 10, [], [
        { field: 'email', type: '=', value: 'a@example.com' }
      ], SCHEMA, []);
      expect(data.result.length).toBe(1);
    });

    it("should filter with a raw filter string", async () => {
      const data = await util.connection.selectTop('people', 0, 10, [], `"address_id" = 2`, SCHEMA, []);
      expect(data.result.length).toBe(3);
    });

    it("should generate LIMIT/OFFSET sql in selectTopSql", async () => {
      const sql = await util.connection.selectTopSql('people', 10, 5, [], [], SCHEMA, []);
      expect(sql).toContain('LIMIT 5');
      expect(sql).toContain('OFFSET 10');
      expect(sql).toContain(`"${SCHEMA}"."people"`);
    });

    it("should stream table data in chunks", async () => {
      const stream = await util.connection.selectTopStream('people', [{ field: 'id', dir: 'ASC' }], [], 2, SCHEMA);
      expect(stream.totalRows).toBe(5);

      await stream.cursor.start();
      const allRows = [];
      let chunk = await stream.cursor.read();
      while (chunk.length > 0) {
        allRows.push(...chunk);
        chunk = await stream.cursor.read();
      }
      expect(allRows.length).toBe(5);
      await stream.cursor.cancel();
    });
  });

  describe("Query execution", () => {
    it("should execute an ad-hoc query", async () => {
      const query = await util.connection.query(`SELECT "id", "email" FROM "${SCHEMA}"."people" ORDER BY "id"`);
      const results = await query.execute();

      expect(results.length).toBe(1);
      expect(results[0].rows.length).toBe(5);
      expect(results[0].fields.map((f) => f.name)).toEqual(['id', 'email']);
    });

    it("should execute multiple statements in one query", async () => {
      const results = await util.connection.executeQuery(`SELECT 1 AS "a" FROM DUMMY; SELECT 2 AS "b" FROM DUMMY`);
      expect(results.length).toBe(2);
      expect(Number(results[0].rows[0].a)).toBe(1);
      expect(Number(results[1].rows[0].b)).toBe(2);
    });

    it("should cancel a query without breaking the pool", async () => {
      const query = await util.connection.query(`SELECT COUNT(*) FROM "${SCHEMA}"."people"`);
      await query.cancel();

      // pool should still serve new queries
      const results = await util.connection.executeQuery(`SELECT 1 AS "ok" FROM DUMMY`);
      expect(Number(results[0].rows[0].ok)).toBe(1);
    });
  });

  describe("Create scripts and properties", () => {
    it("should get table properties", async () => {
      const props = await util.connection.getTableProperties('people', SCHEMA);
      expect(props.indexes.length).toBeGreaterThanOrEqual(1);
      expect(props.relations.length).toBeGreaterThanOrEqual(2);
      expect(props.triggers.length).toBe(1);
    });

    it("should generate a table create script", async () => {
      const script = await util.connection.getTableCreateScript('people', SCHEMA);
      expect(script.toUpperCase()).toContain('CREATE');
      expect(script).toContain('people');
    });

    it("should get a view create script", async () => {
      const scripts = await util.connection.getViewCreateScript('people_view', SCHEMA);
      expect(scripts.length).toBe(1);
      expect(scripts[0].toUpperCase()).toContain('SELECT');
    });

    it("should get a routine create script", async () => {
      const scripts = await util.connection.getRoutineCreateScript('test_proc', 'procedure', SCHEMA);
      expect(scripts.length).toBe(1);
      expect(scripts[0].toUpperCase()).toContain('PROCEDURE');
    });
  });

  describe("Write operations are stubbed", () => {
    it("should reject table data changes", async () => {
      await expect(util.connection.executeApplyChanges({ inserts: [], updates: [], deletes: [] } as any))
        .rejects.toThrow();
    });

    it("should reject database creation", async () => {
      await expect(util.connection.createDatabase('nope', '', '')).rejects.toThrow();
    });

    it("should return empty sql for unsupported statement generators", async () => {
      expect(await util.connection.setElementNameSql('a', 'b', 'TABLE' as any, SCHEMA)).toBe('');
      expect(await util.connection.truncateElementSql('a', 'TABLE' as any, SCHEMA)).toBe('');
      expect(await util.connection.duplicateTableSql('a', 'b', SCHEMA)).toBe('');
    });
  });
});
