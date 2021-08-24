export default {
  name: "20210822_add_explorer_prefences_to_settings",
  async run(runner) {
    const queries = [
      `INSERT INTO user_setting(key, defaultValue,valueType) VALUES
      ('lastWorkspace', '-1', '2')
      `,
      `INSERT INTO user_setting(key, defaultValue,valueType) VALUES
      ('removeWarningDirectory', '1', '2')
      `,
      `INSERT INTO user_setting(key, defaultValue,valueType) VALUES
      ('removeWarningWorkspace', '1', '2')
      `
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
