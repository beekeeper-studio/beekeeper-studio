
export default {
  name: "20200519-add-auth-type",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN authenticationType varchar(255) default null')
    await runner.query('ALTER TABLE used_connection ADD COLUMN authenticationType varchar(255) default null')
  }
}
