export default {
  name: "20250522_add_disabled_plugin_auto_updates",
  async run(runner) {
    const query = `
      INSERT INTO user_setting(key, defaultValue, valueType)
        VALUES ('disabledAutoUpdatePlugins', '[]', 4)
    `;
    await runner.query(query);
  }
}