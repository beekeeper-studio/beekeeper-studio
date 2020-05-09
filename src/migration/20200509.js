
export default {
  name: "20200509-add-sslCaFile-column",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN sslCaFile varchar')
    await runner.query('ALTER TABLE used_connection ADD COLUMN sslCaFile varchar')
  }
}