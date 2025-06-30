export default {
  name: '20250630_create_plugin_data',
  async run(runner) {
    // Create the plugin_data table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS plugin_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pluginId TEXT NOT NULL,
        key TEXT NOT NULL DEFAULT 'default',
        value TEXT NOT NULL DEFAULT '"null"',
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
}
