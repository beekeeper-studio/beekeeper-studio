export default {
  name: "20250819_add_iamAuthOptions",
  async run(runner) {
    const queries = [
      `ALTER TABLE saved_connection ADD COLUMN iamAuthOptions TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE used_connection ADD COLUMN iamAuthOptions TEXT NOT NULL DEFAULT '{}'`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  },
};
