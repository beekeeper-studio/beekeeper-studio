export default {
  name: "20240923_user_settings_default_workspace",
  async run(runner) {
    const query = `INSERT INTO user_setting(key, defaultValue, userValue, valueType) VALUES ('lastUsedWorkspace', -1, -1, 0)`;
    await runner.query(query);
  }
}