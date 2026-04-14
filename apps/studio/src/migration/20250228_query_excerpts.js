export default {
  name: "20250228_query_excerpts",
  async run(runner) {
    const queries = [
      `ALTER TABLE used_query ADD COLUMN excerpt TEXT `,
      `ALTER TABLE favorite_query ADD COLUMN excerpt TEXT`,
      `UPDATE used_query SET excerpt = SUBSTR(text, 1, 250)`,
      `UPDATE favorite_query SET excerpt = SUBSTR(text, 1, 250)`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
