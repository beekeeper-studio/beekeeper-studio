// Integration tests for Bedrock (Expensify's SQLite-over-MySQL-wire DB).
//
// Bedrock's MySQL plugin is a thin shim — it accepts MySQL wire-protocol
// handshakes, but forwards the raw SQL string to SQLite with no DDL
// translation. That means the generic `runCommonTests` harness (which
// generates MySQL-flavored DDL via knex's mysql2 client) doesn't work; a
// `CREATE TABLE ... AUTO_INCREMENT` statement gets to SQLite and errors.
//
// Instead, this spec spins up `rathboma/bedrock`, creates tables with raw
// SQLite DDL, and directly exercises the `BedrockClient` overrides we care
// about: `listTables`, `listTableColumns`, `listTableIndexes`,
// `listTableTriggers`, `getTableKeys`, `getPrimaryKeys`, `getVersion`,
// `listDatabases`, `listSchemas`, `listRoutines`, `executeApplyChanges`.
import knex from "knex";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";

const BEDROCK_IMAGE = "rathboma/bedrock:2026-04-09";

describe("Bedrock", () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let util: DBTestUtil;

  beforeAll(async () => {
    container = await new GenericContainer(BEDROCK_IMAGE)
      // 3306 = MySQL plugin. 8888 is the native command port (unused here).
      .withExposedPorts(3306, 8888)
      // The stock image only binds the MySQL plugin to 127.0.0.1; override so
      // testcontainers can reach it from the host.
      .withCommand(["-mysql.host", "0.0.0.0:3306"])
      .withStartupTimeout(dbtimeout)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(3306);

    // DBTestUtil needs *some* knex to construct; we're not using it here (we
    // skip setupdb and issue raw SQLite DDL directly), but the constructor
    // throws if `client: 'bedrock'` reaches knex. Give it a mysql2 knex that
    // will never run queries.
    const dummyKnex = knex({
      client: "mysql2",
      connection: { host, port, user: "", password: "", database: "test" },
      pool: { min: 0, max: 1 },
    });

    util = new DBTestUtil(
      {
        client: "bedrock",
        host,
        port,
        user: "",
        password: "",
        readOnlyMode: false,
      } as any,
      "test",
      { dialect: "sqlite", knex: dummyKnex }
    );

    // Skip util.setupdb() — its createTables() uses knex mysql2, which emits
    // AUTO_INCREMENT / TIMESTAMP-with-default DDL that Bedrock's SQLite
    // backend rejects. Create a minimal schema with raw SQLite DDL instead.
    await util.connection.connect();
    await util.connection.executeQuery(`
      CREATE TABLE widgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT 'red',
        qty INTEGER
      );
    `);
    await util.connection.executeQuery(`
      CREATE TABLE owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL
      );
    `);
    await util.connection.executeQuery(`
      CREATE TABLE widget_owners (
        widget_id INTEGER NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
        owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE SET NULL,
        PRIMARY KEY (widget_id, owner_id)
      );
    `);
    await util.connection.executeQuery(
      `CREATE INDEX widgets_name_idx ON widgets(name);`
    );
    await util.connection.executeQuery(`
      CREATE TRIGGER widgets_touch AFTER UPDATE ON widgets
      BEGIN
        UPDATE widgets SET qty = qty WHERE id = NEW.id;
      END;
    `);
    await util.connection.executeQuery(
      `INSERT INTO widgets (name, qty) VALUES ('alpha', 1), ('beta', 2);`
    );
  });

  afterAll(async () => {
    if (util) await util.disconnect();
    if (container) await container.stop();
  });

  it("reports a sqlite version", async () => {
    const version = await util.connection.versionString();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("lists user tables via sqlite_master, not information_schema", async () => {
    const tables = await util.connection.listTables();
    const names = tables.map((t) => t.name);
    // Bedrock's Cache/Jobs plugins create their own bookkeeping tables, so
    // we just assert ours show up rather than expect an exact list.
    expect(names).toEqual(expect.arrayContaining(["widgets", "owners", "widget_owners"]));
  });

  it("lists no views when there are none", async () => {
    const views = await util.connection.listViews();
    expect(views).toEqual([]);
  });

  it("lists table columns with types and nullability via PRAGMA", async () => {
    const cols = await util.connection.listTableColumns("widgets");
    const byName = Object.fromEntries(cols.map((c) => [c.columnName, c]));
    expect(byName.id).toMatchObject({
      tableName: "widgets",
      dataType: "INTEGER",
      ordinalPosition: 0,
    });
    expect(byName.name.nullable).toBe(false);
    expect(byName.color.defaultValue).toBe("'red'");
    expect(byName.color.hasDefault).toBe(true);
    expect(byName.qty.nullable).toBe(true);
    for (const c of cols) {
      expect(c.bksField).toEqual({ name: c.columnName, bksType: "UNKNOWN" });
    }
  });

  it("lists indexes via PRAGMA index_list", async () => {
    const indexes = await util.connection.listTableIndexes("widgets");
    const user = indexes.find((i) => i.name === "widgets_name_idx");
    expect(user).toBeDefined();
    expect(user!.columns.map((c) => c.name)).toEqual(["name"]);
  });

  it("lists triggers from sqlite_master", async () => {
    const triggers = await util.connection.listTableTriggers("widgets");
    expect(triggers.map((t) => t.name)).toContain("widgets_touch");
  });

  it("returns foreign keys from pragma foreign_key_list", async () => {
    const keys = await util.connection.getTableKeys("widget_owners");
    const targets = keys.map((k) => k.toTable).sort();
    expect(targets).toEqual(["owners", "widgets"]);
    const widgetFk = keys.find((k) => k.toTable === "widgets");
    expect(widgetFk).toMatchObject({
      fromColumn: "widget_id",
      toColumn: "id",
      onDelete: "CASCADE",
    });
  });

  it("returns composite primary keys", async () => {
    const pks = await util.connection.getPrimaryKeys("widget_owners");
    const cols = pks.map((p) => p.columnName).sort();
    expect(cols).toEqual(["owner_id", "widget_id"]);
  });

  it("getPrimaryKey returns null for composite keys", async () => {
    const pk = await util.connection.getPrimaryKey("widget_owners");
    expect(pk).toBeNull();
  });

  it("getPrimaryKey returns the column name for single-column PKs", async () => {
    const pk = await util.connection.getPrimaryKey("widgets");
    expect(pk).toBe("id");
  });

  it("lists databases via PRAGMA database_list", async () => {
    const dbs = await util.connection.listDatabases();
    expect(dbs.length).toBeGreaterThan(0);
  });

  it("lists no schemas (sqlite-style)", async () => {
    expect(await util.connection.listSchemas()).toEqual([]);
  });

  it("lists no routines (sqlite-style)", async () => {
    expect(await util.connection.listRoutines()).toEqual([]);
  });

  it("reports table length and properties", async () => {
    const length = await util.connection.getTableLength("widgets");
    expect(length).toBe(2);
    const props = await util.connection.getTableProperties("widgets");
    expect(props.size).toBe(2);
    expect(props.indexes.some((i) => i.name === "widgets_name_idx")).toBe(true);
    expect(props.triggers.some((t) => t.name === "widgets_touch")).toBe(true);
  });

  it("round-trips inserts, updates, and deletes via executeApplyChanges", async () => {
    await util.connection.executeQuery(
      `CREATE TABLE changes_test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
    );

    const insertResult = await util.connection.applyChanges({
      inserts: [
        {
          table: "changes_test",
          schema: "",
          data: [{ name: "first" }, { name: "second" }],
        } as any,
      ],
      updates: [],
      deletes: [],
    });
    expect(insertResult).toBeDefined();

    const after = await util.connection.executeQuery(
      "SELECT id, name FROM changes_test ORDER BY id"
    );
    const rows = after[0].rows as Array<{ id: number; name: string }>;
    expect(rows.map((r) => r.name)).toEqual(["first", "second"]);

    await util.connection.applyChanges({
      inserts: [],
      updates: [
        {
          table: "changes_test",
          schema: "",
          column: "name",
          primaryKeys: [{ column: "id", value: rows[0].id }],
          value: "first-updated",
        } as any,
      ],
      deletes: [],
    });
    const postUpdate = await util.connection.executeQuery(
      `SELECT name FROM changes_test WHERE id = ${rows[0].id}`
    );
    expect((postUpdate[0].rows as any[])[0].name).toBe("first-updated");

    await util.connection.applyChanges({
      inserts: [],
      updates: [],
      deletes: [
        {
          table: "changes_test",
          schema: "",
          primaryKeys: [{ column: "id", value: rows[1].id }],
        } as any,
      ],
    });
    const postDelete = await util.connection.executeQuery(
      "SELECT COUNT(*) AS n FROM changes_test"
    );
    expect(Number((postDelete[0].rows as any[])[0].n)).toBe(1);
  });
});
