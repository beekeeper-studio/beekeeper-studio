export default {
  name: "20220907_create_hidden_entities",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS hidden_entities (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "databaseName" varchar(255) NOT NULL,
        "schemaName" varchar(255) NULL,
        "entityName" varchar(255) NOT NULL,
        "entityType" varchar(50) NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0,
        "connectionId" integer,
        "workspaceId" integer NOT NULL DEFAULT -1,
        UNIQUE(workspaceId, connectionId, schemaName, entityType, entityName)
      )
    `)
  }
}
