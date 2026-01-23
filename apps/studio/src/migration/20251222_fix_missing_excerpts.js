export default {
  name: "20251222_fix_missing_excerpts.js",
  async run(runner) {
    const query = `UPDATE favorite_query SET excerpt = SUBSTR(text, 1, 250) WHERE excerpt IS NULL` ;

    await runner.query(query);
  }
}
