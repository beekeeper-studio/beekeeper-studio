export default {
  name: "20260724_add_sqlite_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN sqliteOptions text not null default '{}'`,
      `ALTER TABLE used_connection ADD COLUMN sqliteOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
