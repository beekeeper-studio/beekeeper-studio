export default {
  name: '20250831_create_formatter_presets',
  async run(runner) {
    // Create the formatter_presets table
    await runner.query(`
      CREATE TABLE IF NOT EXISTS formatter_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        systemDefault INTEGER NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
}
