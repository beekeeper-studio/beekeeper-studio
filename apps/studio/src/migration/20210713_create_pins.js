export default {
  name: "20210713_create_pins",
  async run(runner) {
    const queries = [
      `
      CREATE TABLE IF NOT EXISTS pins (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "databaseName" varchar(255) NOT NULL,
        "schemaName" varchar(255) NULL,
        "entityName" varchar(255) NOT NULL,
        "entityType" varchar(50) NOT NULL,
        "open" boolean NOT NULL DEFAULT false,
        "position" float NOT NULL DEFAULT 99,
        "savedConnectionId" integer REFERENCES saved_connection(id) ON DELETE SET NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0,
        UNIQUE(savedConnectionId, databaseName, entityType, schemaName, entityName)
      )
      `,
      'CREATE INDEX saved_connection_index on pins(savedConnectionId)'

    ]
      for (let index = 0; index < queries.length; index++) {
        await runner.query(queries[index])
      }
  }
}