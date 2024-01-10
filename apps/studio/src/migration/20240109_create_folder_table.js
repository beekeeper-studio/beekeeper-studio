export default {
  name: "20240109_create_folder_table",
  async run(runner) {
    const queries = [
      `
        CREATE TABLE connection_folder (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          description VARCHAR(255),
          createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
          updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
          version INTEGER NOT NULL DEFAULT 0
        )
      `,
      'ALTER TABLE saved_connection ADD COLUMN connectionFolderId INTEGER',
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
};
