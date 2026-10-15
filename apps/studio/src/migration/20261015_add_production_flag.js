export default {
  name: '20261015-add-production-flag',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN isProduction boolean not null default false`,
      `ALTER TABLE used_connection ADD COLUMN isProduction boolean not null default false`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
