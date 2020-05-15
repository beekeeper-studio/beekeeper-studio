
export default {
  name: "20200513-add-bastion-host",
  async run(runner) {
    await runner.query('ALTER TABLE saved_connection ADD COLUMN sshBastionHost varchar(255) default null')
    await runner.query('ALTER TABLE used_connection ADD COLUMN sshBastionHost varchar(255) default null')

  }
}