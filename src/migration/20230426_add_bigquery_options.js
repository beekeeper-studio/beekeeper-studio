export default {
  name: "20230426-add-bigquery_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN bigQueryOptions text not null default '{}'`,
      `ALTER TABLE used_connection  ADD COLUMN bigQueryOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
