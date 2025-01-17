export default {
  name: 'add-tab-history',
  async run(runner) {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS tab_history(
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "tabType" varchar(64) NULL,
          "title" varchar(255) NULL,
          "tabId" integer NULL,
          "unsavedQueryText" text NULL,
          "tableName" varchar(255) NULL,
          "schemaName" varchar(255) NULL,
          "entityType" varchar(255) NULL,
          "workspaceId" integer NOT NULL DEFAULT -1,
          "connectionId" integer NULL,
          "lastActive" datetime NOT NULL DEFAULT (datetime('now')),
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "version" integer NOT NULL DEFAULT 0
        )
      `,
      'CREATE INDEX IF NOT EXISTS tab_index on tabs(tabId)'
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}