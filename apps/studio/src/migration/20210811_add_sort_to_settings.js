export default {
  name: "20210811_add_sort_to_settings",
  async run(runner) {
    const queries = [
      `
        INSERT INTO user_setting (key, defaultValue, valueType)
        VALUES
        ('sortOrder', 'id', '0')
      `
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}
