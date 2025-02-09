export default {
  name: "2025_add_new_url_field_take_2",
  async run(runner) {
    const queries = [
      `
        ALTER TABLE
          "used_connection"
        RENAME COLUMN
          "uri" TO "url";
      `,
      `
        ALTER TABLE
          "saved_connection"
        RENAME COLUMN
          "uri" TO "url";
      `
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
