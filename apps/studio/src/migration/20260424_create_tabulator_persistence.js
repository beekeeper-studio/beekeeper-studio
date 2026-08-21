export default {
  name: "20260424_create_tabulator_persistence",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS tabulator_persistence (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "persistenceID" varchar(500) NOT NULL,
        "type" varchar(32) NOT NULL,
        "data" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0,
        UNIQUE(persistenceID, type)
      )
    `)
    await runner.query(
      `CREATE INDEX IF NOT EXISTS tabulator_persistence_pid_idx ON tabulator_persistence(persistenceID)`
    )
  }
}
