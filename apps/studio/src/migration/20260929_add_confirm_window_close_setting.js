export default {
  name: "20260929_add_confirm_window_close_setting",
  async run(runner) {
    const query = `INSERT OR IGNORE INTO user_setting(key, defaultValue, valueType) VALUES ('dontConfirmWindowClose', 'false', 5)`;
    await runner.query(query);
  }
}
