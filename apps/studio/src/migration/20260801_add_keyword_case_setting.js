export default {
  name: "20260801_add_keyword_case_setting",
  async run(runner) {
    const query = `
      INSERT OR IGNORE INTO user_setting (key, defaultValue, valueType) VALUES
        ('keywordCase', 'preserve', '0')
    `;
    await runner.query(query);
  }
}
