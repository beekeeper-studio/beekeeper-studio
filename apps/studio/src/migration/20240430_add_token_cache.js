export default {
  name: "20240430-add-token-cache",
  async run(runner) {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS token_cache (
          "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
          "homeId" varchar(255) NULL,
          "cache" TEXT NULL,
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "version" integer NOT NULL DEFAULT 0
        )
      `,
      `ALTER TABLE saved_connection ADD COLUMN azureAuthOptions TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE saved_connection ADD COLUMN authId INTEGER NULL`,
      `ALTER TABLE used_connection ADD COLUMN azureAuthOptions TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE used_connection ADD COLUMN authId INTEGER NULL`,
    ];
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query);
    }
  }
}
