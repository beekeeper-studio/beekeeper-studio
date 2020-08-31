
export default {
  name: "20200707-add-sc-to-used-connections",
  async run(runner) {
    await runner.query('ALTER TABLE used_connection ADD COLUMN socketPath varchar(255) NULL')
    await runner.query('ALTER TABLE saved_connection ADD COLUMN socketPath varchar(255) NULL')
    await runner.query('ALTER TABLE used_connection ADD COLUMN connectionMethod varchar(255) NULL')
    await runner.query('ALTER TABLE saved_connection ADD COLUMN connectionMethod varchar(255) NULL')
  }
}
