export default {
    name: "20240303_user_settings_window_position",
    async run(runner) {
      const query = `INSERT INTO user_setting(key, defaultValue,valueType) VALUES ('windowPosition', '{"width":1200,"height":800}', '3')`;
      await runner.query(query);
    }
  }