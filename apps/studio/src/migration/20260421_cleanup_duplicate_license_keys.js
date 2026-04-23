export default {
  name: "20260421-cleanup-duplicate-license-keys",
  async run(runner) {
    const queries = [
      // Collapse duplicate (email, key) rows down to the earliest one.
      // Earlier versions of LicenseModule.update could insert rather than
      // update on each interval tick, so users ended up with thousands of
      // identical rows. Keep MIN(id) because that's the original entry.
      `DELETE FROM license_keys
       WHERE id NOT IN (
         SELECT MIN(id)
         FROM license_keys
         GROUP BY email, key
       )`,
      // Backstop: even if a caller tries to re-insert a duplicate, the DB
      // will reject it.
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_license_keys_email_key
       ON license_keys(email, key)`,
    ]
    for (const query of queries) {
      await runner.query(query)
    }
  }
}
