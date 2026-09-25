export default {
  name: '20260925-add-anon-to-saved-connection',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN anon boolean not null default false`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
