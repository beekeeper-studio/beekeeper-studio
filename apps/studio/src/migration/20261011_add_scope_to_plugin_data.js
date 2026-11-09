export default {
  name: '20261011_add_scope_to_plugin_data',
  async run(runner) {
    const queries = [
      `ALTER TABLE plugin_data ADD COLUMN connectionId integer NULL`,
      `ALTER TABLE plugin_data ADD COLUMN workspaceId integer NULL`,
      `ALTER TABLE encrypted_plugin_data ADD COLUMN connectionId integer NULL`,
      `ALTER TABLE encrypted_plugin_data ADD COLUMN workspaceId integer NULL`,
    ]
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i])
    }
  }
}
