export default {
  name: "20240122_add_default_export_path",
  async run(runner) {
    const queries = [
      `INSERT INTO user_setting(key, defaultValue, valueType)
        VALUES ('lastExportPath', '', '0')`
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}
