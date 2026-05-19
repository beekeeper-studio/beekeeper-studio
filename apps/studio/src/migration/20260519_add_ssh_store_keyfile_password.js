export default {
  name: '20260519_add_ssh_store_keyfile_password',
  async run(runner) {
    await runner.query(`
      ALTER TABLE saved_connection
      ADD COLUMN sshStoreKeyfilePassword BOOLEAN NOT NULL DEFAULT 1
    `)
  }
}
