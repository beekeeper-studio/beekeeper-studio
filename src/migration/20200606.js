
export default {
  name: "20200606-add-table-model",
  async run(runner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS "model_erd" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "version" integer NOT NULL, "title" varchar NOT NULL, "text" text NOT NULL, "database" varchar NOT NULL, "connectionHash" varchar NOT NULL)`)
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_a00188943bc11943c9aca850ed" ON "model_erd" ("connectionHash")`)
  }
}
