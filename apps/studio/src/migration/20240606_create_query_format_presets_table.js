export default {
  name: "20240606_create_query_format_presets_table",
  async run(runner) {
    runner.query(`
      CREATE TABLE IF NOT EXISTS query_format_presets (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "values" JSON NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0
      )
    `)
  }
};
