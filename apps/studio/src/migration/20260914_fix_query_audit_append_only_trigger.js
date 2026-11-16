export default {
  name: "20260914_fix_query_audit_append_only_trigger",
  async run(runner) {
    // The old migration rejected all updates (which included deleting), this allows
    // us to delete audits when a favourite query is deleted
    await runner.query(`DROP TRIGGER IF EXISTS query_audit_no_update`);

    await runner.query(`
      CREATE TRIGGER query_audit_no_update
      BEFORE UPDATE OF id, favoriteQueryId, action, title, text, createdAt, updatedAt, version
      ON query_audit
      FOR EACH ROW
      BEGIN
          SELECT RAISE(ABORT, 'query_audit is append-only: updates are not allowed');
      END;
    `);
  },
};
