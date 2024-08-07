
export default {
  name: "20200517-add-label-color-column",
  async run(runner) {
    await runner.query("ALTER TABLE saved_connection ADD COLUMN labelColor varchar(255) default 'default'")
  }
}
