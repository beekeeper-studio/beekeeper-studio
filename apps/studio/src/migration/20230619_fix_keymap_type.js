export default {
  name: "20230619_fix_keymap_type",
  async run(runner) {
    const query = `UPDATE user_setting SET valueType = 0 WHERE key = 'keymap'`;
    await runner.query(query);
  }
}