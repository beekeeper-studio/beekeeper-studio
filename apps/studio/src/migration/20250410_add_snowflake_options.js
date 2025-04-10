export default {
  name: "20250410_add_snowflake_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN snowflakeOptions text not null default '{}'`,
      `ALTER TABLE used_connection ADD COLUMN snowflakeOptions text not null default '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};