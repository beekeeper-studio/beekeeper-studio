export default {
  name: "20240528_add_libsql_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN libsqlOptions text not null default '{}'`,
      `ALTER TABLE used_connection  ADD COLUMN libsqlOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
