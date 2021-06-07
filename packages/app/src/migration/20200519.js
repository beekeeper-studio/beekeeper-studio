
export default {
  name: "20200519-add-domain",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN domain varchar(255) default null')
    await runner.query('ALTER TABLE used_connection ADD COLUMN domain varchar(255) default null')
  }
}
