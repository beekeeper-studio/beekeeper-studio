export default {
  name: "20210713_create_pinned_tables",
  async run(runner) {
    const query = 
      `
      CREATE TABLE IF NOT EXISTS pinned_tables (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "databaseName" varchar(255) NOT NULL,
        "schemaName" varchar(255) NULL,
        "tableName" varchar(255) NOT NULL,
        "open" boolean NOT NULL DEFAULT false,
        "position" float NOT NULL DEFAULT 99,
        "savedConnectionId" integer REFERENCES saved_connection(id) ON DELETE SET NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0

      )
      `
      await runner.query(query)
  }
}