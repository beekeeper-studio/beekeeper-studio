export default {
  name: "20241017_add_user_setting_keymap",
  async run(runner) {
    const query = `INSERT OR IGNORE INTO user_setting (key, defaultValue, userValue, valueType) VALUES ('keymap', 'default', 'default', 0)`;
    await runner.query(query);
  }
}
