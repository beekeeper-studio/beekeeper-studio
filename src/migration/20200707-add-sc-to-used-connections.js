
export default {
  name: "20200707-add-sc-to-used-connections",
  async run(runner) {
    await runner.query('ALTER TABLE used_connection ADD COLUMN savedConnectionId integer REFERENCES saved_connection(id) ON DELETE SET NULL')
    await runner.query('DELETE FROM used_connection')
  }
}
