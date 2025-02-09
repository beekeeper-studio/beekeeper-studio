export default {
  name: "2025_add_new_url_field",
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
  }
}
