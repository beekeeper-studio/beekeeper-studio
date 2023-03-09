export default {
  name: "20230308_create_connection_pins",
  async run(runner) {
    const queries = [
      `
      CREATE TABLE IF NOT EXISTS connection_pins (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "position" FLOAT NOT NULL DEFAULT 99,
        "connectionId" INTEGER,
        "workspaceId" INTEGER NOT NULL DEFAULT -1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0
      )
      `,
      'CREATE INDEX IF NOT EXISTS saved_connection_pins_index ON connection_pins(connectionId)'
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
