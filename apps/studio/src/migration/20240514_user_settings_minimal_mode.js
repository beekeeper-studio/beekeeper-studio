export default {
    name: "20240514_user_settings_minimal_mode",
    async run(runner) {
      const query = `INSERT INTO user_setting(key, defaultValue, valueType) VALUES ('minimalMode', 'false', 5)`;
      await runner.query(query);
    }
  }
