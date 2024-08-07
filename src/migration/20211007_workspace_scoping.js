export default {
  name: '20211007_workspace_scoping',
  async run(runner) {
    const queries = [
      `ALTER TABLE pins
        ADD COLUMN connectionId integer`,
        `ALTER TABLE pins ADD COLUMN workspaceId integer not null default -1`,
      `
        ALTER TABLE used_connection
          ADD COLUMN workspaceId integer not null default -1
      `,
      `ALTER TABLE used_connection ADD COLUMN connectionId integer null`,
      `
        UPDATE pins
        set connectionId = savedConnectionId
        WHERE savedConnectionId is not null
      `,
      `
      UPDATE used_connection
      SET connectionId = savedConnectionId
      WHERE savedConnectionId is not null
      `
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}