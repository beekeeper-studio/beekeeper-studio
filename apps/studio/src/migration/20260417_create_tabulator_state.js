export default {
  name: '20260417_create_tabulator_state',
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS tabulator_state (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        workspaceId INTEGER NOT NULL DEFAULT -1,
        connectionId INTEGER NOT NULL REFERENCES saved_connection(id) ON DELETE CASCADE,
        schema VARCHAR(255) NOT NULL DEFAULT '',
        "table" VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `)
    await runner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tabulator_state_key
      ON tabulator_state(workspaceId, connectionId, schema, "table")
    `)
  }
}
