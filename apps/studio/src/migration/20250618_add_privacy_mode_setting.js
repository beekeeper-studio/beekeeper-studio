export default {
  name: "20250618_add_privacy_mode_setting",
  async run(runner) {
    const query = `INSERT INTO user_setting(key, defaultValue, valueType) VALUES ('privacyMode', 'false', 5)`;
    await runner.query(query);
  }
}