export default {
  name: "20241009-add-beta-toggle",
  async run(runner) {
    const query = `
      INSERT INTO user_setting(key, defaultValue, valueType)
        VALUES ('useBeta', 'false', 5)
    `;
    await runner.query(query);
  }
}
