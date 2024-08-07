
export default {
  name: "20200422-add-ssl-column",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN ssl boolean not null default false')
    await runner.query('ALTER TABLE used_connection ADD COLUMN ssl boolean not null default false')
  }
}