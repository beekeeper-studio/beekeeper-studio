export default {
  name: "20250529_add_plugin_settings",
  async run(runner) {
    await runner.query(`
      INSERT INTO user_setting(key, defaultValue, valueType)
        VALUES ('pluginSettings', '{}', 3);
    `);
  },
};
