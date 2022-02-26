
export default {
  name: 'add-opentabs',
  async run(runner) {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS tabs(
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "tabType" varchar(64) NOT NULL DEFAULT 'query',
          "title" varchar(255) NOT NULL,
          "titleScope" varchar(255) NULL,
          "alert" boolean DEFAULT FALSE,
          "queryId" integer NULL,
          "unsavedChanges" boolean NOT NULL DEFAULT false,
          "unsavedQueryText" text NULL,
          "tableName" varchar(255) NULL,
          "schemaName" varchar(255) NULL,
          "entityType" varchar(255) NULL,
          "workspaceId" integer NOT NULL DEFAULT -1,
          "connectionId" integer NULL,
          "filters" text NULL DEFAULT '[]',
          "position" float NOT NULL default 99,
          "active" boolean NOT NULL default FALSE,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "version" integer NOT NULL DEFAULT 0
        )
      `,
      'CREATE INDEX tabs_index on tabs(workspaceId, connectionId)'
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}