export default {
  name: '20260326_rename_ssh_jump_host_to_ssh_config',
  async run(runner) {
    // Rename the table from ssh_jump_host to ssh_config
    await runner.query(`ALTER TABLE ssh_jump_host RENAME TO ssh_config`)
  }
}
