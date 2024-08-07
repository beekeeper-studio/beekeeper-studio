export default {
  name: "20220908_create_hidden_schemas",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS hidden_schemas (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(255) NOT NULL,
        "databaseName" varchar(255) NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0,
        "connectionId" integer,
        "workspaceId" integer NOT NULL DEFAULT -1,
        UNIQUE(workspaceId, connectionId, databaseName, name)
      )
    `)
  }
}
