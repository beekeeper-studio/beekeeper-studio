export default {
  name: "20260714_add_disable_sql_autocomplete_setting",
  async run(runner) {
    const query = `INSERT OR IGNORE INTO user_setting (key, defaultValue, userValue, valueType) VALUES ('disableSqlAutocomplete', 'false', 'false', 5)`;
    await runner.query(query);
  }
}
