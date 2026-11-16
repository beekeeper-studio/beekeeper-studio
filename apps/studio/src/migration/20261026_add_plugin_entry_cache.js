export default {
  name: "20261026_add_plugin_entry_cache",
  async run(runner) {
    const query = `
      CREATE TABLE IF NOT EXISTS plugin_entry_cache (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "repo" TEXT NOT NULL,
        "origin" VARCHAR(10) NOT NULL
      )
    `;
    await runner.query(query);
  }
}
