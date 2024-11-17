export default {
  name: 'add-tab-history',
  async run(runner) {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS tab_history(
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "tabType" varchar(64) NOT NULL DEFAULT 'query',
          "title" varchar(255) NOT NULL,
          "tabId" integer NULL,
          "unsavedQueryText" text NULL,
          "tableName" varchar(255) NULL,
          "schemaName" varchar(255) NULL,
          "entityType" varchar(255) NULL,
          "workspaceId" integer NOT NULL DEFAULT -1,
          "connectionId" integer NULL,
          "position" float NOT NULL default 99,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
        )
      `,
      'CREATE INDEX IF NOT EXISTS tab_index on tabs(tabId)'
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}