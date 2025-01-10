export default {
  name: "20241017_add_missing_user_settings",
  async run(runner) {
    const query = `
      INSERT OR IGNORE INTO user_setting (key, defaultValue, userValue, valueType) VALUES
        ('connectionsSortBy', 'name', 'name', 0),
        ('connectionsSortOrder', 'asc', 'asc', 0)
    `;
    await runner.query(query);
  }
}
