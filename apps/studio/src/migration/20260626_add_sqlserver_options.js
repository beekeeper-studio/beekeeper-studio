export default {
  name: '20260626-sqlserver-options',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN sqlServerOptions text not null default '{}'`,
      `ALTER TABLE used_connection ADD COLUMN sqlServerOptions text not null default '{}'`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
