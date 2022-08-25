export default {
  name: "20220819_create_excluded_entities",
  async run(runner) {
    const queries = [
      `
      CREATE TABLE IF NOT EXISTS excluded_entities (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "databaseName" varchar(255) NOT NULL,
        "schemaName" varchar(255) NULL,
        "entityName" varchar(255) NOT NULL,
        "entityType" varchar(50) NOT NULL,
        "connectionId" integer,
        "savedConnectionId" integer REFERENCES saved_connection(id) ON DELETE SET NULL,
        "workspaceId" integer NOT NULL DEFAULT -1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0,
        UNIQUE(savedConnectionId, databaseName, entityType, schemaName, entityName)
      )
      `,
    ]
      for (let index = 0; index < queries.length; index++) {
        await runner.query(queries[index])
      }
  }
}