export default {
  name: '20251219_create_plugin_entries',
  async run(runner) {
    // Create the core_plugin_entry table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS core_plugin_entry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pluginId TEXT NOT NULL,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        repo TEXT NOT NULL,
        description TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create the community_plugin_entry table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS community_plugin_entry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pluginId TEXT NOT NULL,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        repo TEXT NOT NULL,
        description TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
}
