export default {
  name: '20250628_create_plugin_data',
  async run(runner) {
    // Create the plugin_data table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS plugin_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pluginId TEXT NOT NULL UNIQUE,
        data TEXT,
        encryptedData TEXT,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create index on pluginId for better query performance
    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_plugin_data_plugin_id
      ON plugin_data (pluginId)
    `);
  }
}
