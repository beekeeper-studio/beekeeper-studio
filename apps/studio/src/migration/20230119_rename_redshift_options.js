export default {
  name: "20230119-rename-redshift-options",
  async run(runner) {
    // Rename 'saved_connection.redshiftOptions`
    const savedColumnExistsQuery = `SELECT COUNT(*) AS COUNT FROM pragma_table_info('saved_connection') WHERE name='redshiftOptions'`
    const savedColumnResults = await runner.query(savedColumnExistsQuery);

    if (Object.values(savedColumnResults[0]).COUNT === 1) {
      const alterSavedColumnNameQuery = `ALTER TABLE saved_connection RENAME COLUMN redshiftOptions TO iamAuthOptions`
      await runner.query(alterSavedColumnNameQuery);
    }

    // Rename 'used_connection.redshiftOptions`
    const usedColumnExistsQuery = `SELECT COUNT(*) AS COUNT FROM pragma_table_info('used_connection') WHERE name='redshiftOptions'`
    const usedColumnResults = await runner.query(usedColumnExistsQuery);

    if (Object.values(usedColumnResults[0]).COUNT === 1) {
      const alterUsedColumnNameQuery = `ALTER TABLE used_connection RENAME COLUMN redshiftOptions TO iamAuthOptions`
      await runner.query(alterUsedColumnNameQuery);
    }
  }
};
