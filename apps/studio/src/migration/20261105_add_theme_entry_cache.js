export default {
  name: "20261105_add_theme_entry_cache",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS theme_entry_cache (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "repo" TEXT NOT NULL,
        "origin" VARCHAR(10) NOT NULL
      )
    `);
  }
}
