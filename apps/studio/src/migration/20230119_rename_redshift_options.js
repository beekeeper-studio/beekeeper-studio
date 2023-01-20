export default {
  name: "20230119-rename-redshift-options",
  async run(runner) {
    const columnExistsQuery = `SELECT COUNT(*) AS COUNT FROM pragma_table_info('saved_connection') WHERE name='redshiftOptions'`
    const columnResults = await runner.query(columnExistsQuery);

    if (Object.values(columnResults[0]).COUNT === 1) {
      const alterColumnNameQuery = `ALTER TABLE saved_connection RENAME COLUMN redshiftOptions TO iamAuthOptions`
      await runner.query(alterColumnNameQuery);
    }
  }
};
