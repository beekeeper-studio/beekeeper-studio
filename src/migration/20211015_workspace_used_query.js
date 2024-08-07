export default {
  name: '20211015_workspace_used_query',
  async run(runner) {
    const queries = [
      `ALTER TABLE used_query ADD COLUMN connectionId integer`,
      `ALTER TABLE used_query ADD COLUMN workspaceId integer not null default -1`,
      `CREATE INDEX used_query_workspace_connection on used_query(workspaceId, connectionId)`,
      `CREATE INDEX used_connection_workspace_connection on used_connection(workspaceId, connectionId)`,
      `CREATE INDEX pins_workspace_connection on pins(workspaceId, connectionId)`
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}