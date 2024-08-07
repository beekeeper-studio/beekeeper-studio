export default {
  name: "20220817-add-redshift_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN redshiftOptions text not null default '{}'`,
      `ALTER TABLE used_connection  ADD COLUMN redshiftOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
