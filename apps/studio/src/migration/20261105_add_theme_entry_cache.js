export default {
  name: "20261105_add_theme_entry_cache",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS theme_entry_cache (
        "id" TEXT NOT NULL PRIMARY KEY,
        "origin" VARCHAR(10) NOT NULL
      )
    `);
  }
}
