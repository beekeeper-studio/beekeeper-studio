export default {
  name: "20260821_rename_query_title_to_name",
  async run(runner) {
    // The audit triggers embed `title` in their bodies. SQLite rewrites trigger
    // bodies on RENAME COLUMN, so drop them first to keep this deterministic.
    await runner.query(`DROP TRIGGER IF EXISTS query_audit_insert`);
    await runner.query(`DROP TRIGGER IF EXISTS query_audit_update`);

    await runner.query(
      `ALTER TABLE favorite_query RENAME COLUMN "title" TO "name"`
    );
    await runner.query(
      `ALTER TABLE query_audit RENAME COLUMN "title" TO "name"`
    );

    await runner.query(`
      CREATE TRIGGER query_audit_insert
      AFTER INSERT ON favorite_query
      FOR EACH ROW
      BEGIN
        INSERT INTO query_audit (favoriteQueryId, action, name, text, version, createdAt, updatedAt)
        VALUES (NEW.id, 'create', NEW.name, NEW.text, 0, NEW.createdAt, NEW.createdAt);
      END;
    `);

    await runner.query(`
      CREATE TRIGGER query_audit_update
      AFTER UPDATE ON favorite_query
      FOR EACH ROW
      WHEN (NEW.name IS NOT OLD.name) OR (NEW.text IS NOT OLD.text)
      BEGIN
        INSERT INTO query_audit (favoriteQueryId, previousAuditId, action, name, text, version, createdAt, updatedAt)
        VALUES (
          NEW.id,
          (SELECT id FROM query_audit WHERE favoriteQueryId = NEW.id ORDER BY createdAt DESC LIMIT 1),
          'update',
          CASE WHEN NEW.name IS NOT OLD.name THEN NEW.name ELSE NULL END,
          CASE WHEN NEW.text IS NOT OLD.text THEN NEW.text ELSE NULL END,
          0,
          NEW.updatedAt,
          NEW.updatedAt
        );
      END;
    `);
  },
};
