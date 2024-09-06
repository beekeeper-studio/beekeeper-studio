
export default {
  name: 'create-licensekeys',
  async run(runner) {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS license_keys(
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "email" varchar(255) NOT NULL,
          "key" varchar(255) NOT NULL,
          "validUntil" datetime NOT NULL,
          "supportUntil" datetime NOT NULL,
          "licenseType" varchar(99) NOT NULL default 'TrialLicense',
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "version" integer NOT NULL DEFAULT 0
        )
      `,
      `INSERT INTO license_keys(email, key, validUntil, supportUntil, licenseType)
       VALUES('trial_user','fake', datetime('now', '14 days'), datetime('now', '14 days'), 'TrialLicense')
      `,
      `
      CREATE TRIGGER testtable_trigger
      BEFORE UPDATE OF key, validUntil, supportUntil ON license_keys
      BEGIN
      SELECT CASE
        WHEN OLD.licenseType = 'TrialLicense' THEN
            RAISE (FAIL,'License cannot be changed')
        END;
      END
      `
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
