export default {
  name: "20250911_upgrade_sqlite_extensions",
  async run(runner) {
    const query = `
      UPDATE user_setting
      SET valueType = 4,
          userValue = CASE
            WHEN userValue IS NOT NULL THEN json_array(userValue)
            ELSE NULL
          END,
          defaultValue = '[]'
      WHERE key = 'sqliteExtensionFile';
    `;

    await runner.query(query)
  }
}
