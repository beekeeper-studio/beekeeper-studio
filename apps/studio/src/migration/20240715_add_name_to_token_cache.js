export default {
  name: "20230715_add_name_to_token_cache",
  async run(runner) {
    const queries = [
      `ALTER TABLE token_cache ADD COLUMN name TEXT NULL`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
