export default {
  name: "20250702_add_surrealdb_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN surrealDbOptions text not null default '{}'`,
      `ALTER TABLE used_connection ADD COLUMN surrealDbOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
