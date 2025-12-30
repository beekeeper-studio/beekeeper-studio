export default {
  name: '20251219_create_plugin_entries',
  async run(runner) {
    // Create the plugin_entry table with origin column
    await runner.query(`
      CREATE TABLE IF NOT EXISTS plugin_entry (
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
