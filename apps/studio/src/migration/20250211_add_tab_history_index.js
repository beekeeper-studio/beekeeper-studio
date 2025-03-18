export default {
  name: '20250211-add-tab-history-index',
  async run(runner) {
    const queries = [
      `CREATE INDEX idx_tabs_deleted_at_desc ON tabs(deletedAt DESC)`,
      `CREATE INDEX idx_tabs_last_active_desc ON tabs(lastActive DESC)`
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
