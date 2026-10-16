export default {
  name: '20260804-query-origin',
  async run(runner) {
    const queries = [
      `ALTER TABLE used_query ADD COLUMN origin TEXT NOT NULL DEFAULT 'app'`,
      `ALTER TABLE used_query ADD COLUMN pluginId TEXT NULL`,
    ]

    for (const query of queries) {
      await runner.query(query)
    }
  }
}
