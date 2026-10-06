export default {
  name: "20260417_add_dynamodb_options",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN dynamoDbOptions TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE used_connection ADD COLUMN dynamoDbOptions TEXT NOT NULL DEFAULT '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      await runner.query(queries[i]);
    }
  },
};
