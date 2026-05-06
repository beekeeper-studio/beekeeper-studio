import { Knex } from 'knex'

// Drops everything an earlier describe block may have left behind.
// runCommonTests / DBTestUtil.setupdb create tables (organizations,
// people, etc.) and assume a clean slate. The RDS suite shares one DB
// across the three auth-method describes, so we run this between them.

export async function resetSchema(knex: Knex, engine: 'pg' | 'mysql'): Promise<void> {
  if (engine === 'pg') {
    await knex.raw(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        FOR r IN (
          SELECT t.typname
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typtype = 'e'
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `)
    return
  }

  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
  try {
    const result = await knex.raw('SHOW TABLES')
    const rows = (Array.isArray(result) ? result[0] : result) || []
    for (const row of rows) {
      const name = Object.values(row)[0] as string
      if (name) await knex.raw(`DROP TABLE IF EXISTS \`${name}\``)
    }
  } finally {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1')
  }
}
