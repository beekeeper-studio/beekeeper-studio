export default {
  name: '20211227_add_workspaceid_to_saved_connections',
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN workspaceId integer not null default -1`,
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}