
export default {
  name: "20200513-add-sshUseAgent",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN sshUseAgent boolean NOT NULL default false')
    await runner.query('ALTER TABLE used_connection ADD COLUMN sshUseAgent bool NOT NULL default false')
  }
}