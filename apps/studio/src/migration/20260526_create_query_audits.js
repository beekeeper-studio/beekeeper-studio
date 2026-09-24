export default {
  name: "20260526_create_query_audits",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS query_audit (
        "id"                    integer   PRIMARY KEY AUTOINCREMENT NOT NULL,
        "favoriteQueryId"       integer   NOT NULL REFERENCES favorite_query (id) ON DELETE CASCADE,
        "previousAuditId"  integer   REFERENCES query_audit (id) ON DELETE SET NULL,
        "action"                varchar   NOT NULL,     -- 'create' or 'update'
        "title"                 varchar,                -- NULL if title was not changed
        "text"                  text,                   -- NULL if text was not changed
        "createdAt"             datetime  NOT NULL DEFAULT (datetime('now')),
        "updatedAt"             datetime  NOT NULL DEFAULT (datetime('now')),
        "version"               integer   NOT NULL DEFAULT 0
      )
    `);

    await runner.query(
      `CREATE INDEX IF NOT EXISTS query_audit_favorite_query_id_idx ON query_audit(favoriteQueryId)`
    );

    // Trigger for INSERT
    await runner.query(`
      CREATE TRIGGER query_audit_insert
      AFTER INSERT ON favorite_query
      FOR EACH ROW
      BEGIN
        INSERT INTO query_audit (favoriteQueryId, action, title, text, version, createdAt, updatedAt)
        VALUES (NEW.id, 'create', NEW.title, NEW.text, 0, NEW.createdAt, NEW.createdAt);
      END;
    `);

    // Trigger for UPDATE
    await runner.query(`
      CREATE TRIGGER query_audit_update
      AFTER UPDATE ON favorite_query
      FOR EACH ROW
      WHEN (NEW.title IS NOT OLD.title) OR (NEW.text IS NOT OLD.text)
      BEGIN
        INSERT INTO query_audit (favoriteQueryId, previousAuditId, action, title, text, version, createdAt, updatedAt)
        VALUES (
          NEW.id,
          (SELECT id FROM query_audit WHERE favoriteQueryId = NEW.id ORDER BY createdAt DESC LIMIT 1),
          'update',
          CASE WHEN NEW.title IS NOT OLD.title  THEN NEW.title  ELSE NULL END,
          CASE WHEN NEW.text  IS NOT OLD.text   THEN NEW.text   ELSE NULL END,
          0,
          NEW.updatedAt,
          NEW.updatedAt
        );
      END;
    `);

    // Trigger for blocking updates to the audit table
    await runner.query(`
      CREATE TRIGGER query_audit_no_update
      BEFORE UPDATE ON query_audit
      FOR EACH ROW
      BEGIN
          SELECT RAISE(ABORT, 'query_audit is append-only: updates are not allowed');
      END;
    `);

    // Seed a baseline create snapshot for existing queries; the model's
    // lifecycle hooks only record audits for saves going forward.
    await runner.query(`
      INSERT INTO query_audit ("favoriteQueryId", "action", "title", "text", "version", "createdAt", "updatedAt")
      SELECT "id", 'create', "title", "text", 0, "createdAt", "createdAt" FROM favorite_query
    `);
  },
};
