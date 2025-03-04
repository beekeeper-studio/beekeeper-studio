export default {
  name: '20241116-tab-history-updates',
  async run(runner) {
    const queries = [
      `ALTER TABLE tabs ADD COLUMN lastActive datetime`,
      `ALTER TABLE tabs ADD COLUMN deletedAt datetime`
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}