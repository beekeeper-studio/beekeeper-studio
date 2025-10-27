export default {
  name: "20250620_add_used_query_id",
  async run(runner) {
    const query = `ALTER TABLE tabs ADD COLUMN usedQueryId INTEGER NULL`;
    await runner.query(query);
  }
}
