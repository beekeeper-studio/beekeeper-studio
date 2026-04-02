export default {
  name: '20260402_create_plugin_entries',
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS plugin_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pluginId TEXT NOT NULL,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        repo TEXT NOT NULL,
        description TEXT NOT NULL,
        origin TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
}
