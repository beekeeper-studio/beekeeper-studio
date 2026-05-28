export default {
  name: "20260526_create_query_audits",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS query_audit (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "favoriteQueryId" integer NOT NULL REFERENCES favorite_query (id) ON DELETE CASCADE,
        "revision" integer NOT NULL,
        "action" varchar NOT NULL,
        "title" varchar NOT NULL,
        "text" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0
      )
    `)
    await runner.query(
      `CREATE INDEX IF NOT EXISTS query_audit_favorite_query_id_idx ON query_audit(favoriteQueryId)`
    )
    // Seed a baseline create snapshot for existing queries; the model's
    // lifecycle hooks only record audits for saves going forward.
    await runner.query(`
      INSERT INTO query_audit ("favoriteQueryId", "revision", "action", "title", "text", "createdAt")
      SELECT "id", 1, 'create', "title", "text", "createdAt" FROM favorite_query
    `)
  }
}
