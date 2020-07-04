

export default {
  name: "20200703_add_zoom_level",
  async run(runner) {
    const queries = [
      `INSERT INTO user_setting(key, defaultValue,valueType) VALUES
    ('zoomLevel', '0', '2')
    `
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}
