export default {
  name: '20260223_create_query_folders',
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS query_folder (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        expanded BOOLEAN NOT NULL DEFAULT 1,
        parentId INTEGER,
        createdAt DATETIME NOT NULL DEFAULT (datetime('now')),
        updatedAt DATETIME NOT NULL DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 0
      )
    `)
    await runner.query(
      'ALTER TABLE favorite_query ADD COLUMN queryFolderId INTEGER'
    )
  }
}
