import { describe, it, expect } from "vitest"
import { identify, Dialect } from "sql-query-identifier"
import { isAllowedReadOnlyQuery } from "@/lib/db/clients/utils"

const dialects: Dialect[] = ['psql', 'mysql', 'mssql', 'sqlite', 'oracle', 'bigquery', 'snowflake', 'dynamodb', 'generic']

const writes = [
  // DML
  "DELETE FROM t",
  "DELETE FROM t WHERE a IN (SELECT a FROM u)",
  "UPDATE t SET a = 1",
  "UPDATE t SET a = (SELECT max(a) FROM u)",
  "INSERT INTO t VALUES (1)",
  "INSERT INTO t (a, b) VALUES (1, 2), (3, 4)",
  "INSERT INTO t SELECT * FROM u",
  "INSERT INTO t SELECT * FROM u UNION ALL SELECT * FROM v",
  "MERGE INTO t USING u ON t.a = u.a WHEN MATCHED THEN DELETE",
  "REPLACE INTO t VALUES (1)",
  "UPSERT INTO t VALUES (1)",
  "WITH x AS (SELECT 1) DELETE FROM t",
  "WITH x AS (SELECT 1) UPDATE t SET a = 1",
  "WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x",
  // DDL
  "CREATE TABLE t (a int)",
  "CREATE TABLE t AS SELECT * FROM u",
  "CREATE VIEW v AS SELECT 1 UNION ALL SELECT 2",
  "CREATE INDEX i ON t (a)",
  "CREATE DATABASE d",
  "CREATE SCHEMA s",
  "ALTER TABLE t ADD b int",
  "DROP TABLE t",
  "DROP VIEW v",
  "DROP INDEX i",
  "DROP DATABASE d",
  "DROP SCHEMA s",
  "TRUNCATE t",
  "TRUNCATE TABLE t",
  // permissions, routines, maintenance, session
  "GRANT ALL ON t TO someone",
  "REVOKE ALL ON t FROM someone",
  "CALL p()",
  "EXEC p",
  "COPY t FROM '/tmp/x'",
  "VACUUM t",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "SET search_path = x",
]

// Each write is checked bare and in every way a statement can open with a
// parenthesis or sit next to a read, so the paren handling can't let it through.
function forms(w: string): string[] {
  return [
    w,
    w.toLowerCase(),
    `${w};`,
    `(${w})`,
    `((${w}))`,
    `( ${w} )`,
    `( /* note */ ${w})`,
    `(/* note */ (${w}))`,
    `-- note\n(${w})`,
    `/* note */ (${w})`,
    `(${w});`,
    `SELECT 1; ${w}`,
    `${w}; SELECT 1`,
    `(SELECT 1); ${w}`,
    `(SELECT 1);\n(${w});`,
    `(${w}); (SELECT 1)`,
    `(SELECT 1) UNION ALL (SELECT 2);\n(${w})`,
    `(SELECT 1); (SELECT 2); ${w}`,
  ]
}

function identified(sql: string, dialect: Dialect) {
  return identify(sql, { strict: false, dialect })
}

function allowed(sql: string, dialect: Dialect) {
  return isAllowedReadOnlyQuery(identified(sql, dialect), true, dialect)
}

describe("isAllowedReadOnlyQuery", () => {
  describe.each(dialects)("%s", (dialect) => {
    it.each([
      "SELECT 1",
      "SELECT a FROM t UNION ALL SELECT a FROM u",
      "WITH r AS (SELECT 1) SELECT * FROM r UNION ALL SELECT 2",
      "SELECT * FROM (SELECT 1 UNION ALL SELECT 2) s",
      "SELECT 1; SELECT 2",
      // PartiQL has no EXPLAIN, and the identifier doesn't type it as a read there
      ...(dialect === 'dynamodb' ? [] : ["EXPLAIN SELECT 1"]),
    ])("allows %s", (sql) => {
      expect(allowed(sql, dialect)).toBe(true)
    })

    it.each([
      "(SELECT 1)",
      "(SELECT 1) UNION ALL (SELECT 2)",
      "(SELECT 1) UNION (SELECT 2)",
      "(SELECT 1) INTERSECT (SELECT 2)",
      "(SELECT 1) EXCEPT (SELECT 2)",
      "(SELECT a FROM t ORDER BY a LIMIT 10) UNION ALL (SELECT a FROM u)",
      "((SELECT 1)) UNION ALL (SELECT 2)",
      "( /* note */ (SELECT 1))",
      "-- note\n(SELECT 1)",
      "(SELECT 1);\n(SELECT 2)",
      "SELECT 1; (SELECT 2) UNION ALL (SELECT 3)",
      "SELECT 1; /* note */ (SELECT 2)",
      "(SELECT 1) ORDER BY 1 LIMIT 1",
      "(WITH c AS (SELECT 1) SELECT * FROM c)",
      ...(dialect === 'dynamodb' ? [] : ["(EXPLAIN SELECT 1)"]),
    ])("allows %s", (sql) => {
      expect(allowed(sql, dialect)).toBe(true)
    })

    it.each(writes.flatMap(forms))("blocks %s", (sql) => {
      expect(allowed(sql, dialect)).toBe(false)
    })

    it.each([
      "DELETE FROM t",
      "(DELETE FROM t)",
      "(SELECT 1); DROP TABLE t",
    ])("allows %s when read-only mode is off", (sql) => {
      expect(isAllowedReadOnlyQuery(identified(sql, dialect), false, dialect)).toBe(true)
    })
  })

  // Clients that never set a dialect (e.g. bigquery, redis) pass undefined.
  describe("without a dialect", () => {
    it("allows a parenthesized read", () => {
      expect(isAllowedReadOnlyQuery(identify("(SELECT 1) UNION ALL (SELECT 2)", { strict: false }), true, undefined)).toBe(true)
    })

    it.each(["(DELETE FROM t)", "(SELECT 1); DELETE FROM t"])("blocks %s", (sql) => {
      expect(isAllowedReadOnlyQuery(identify(sql, { strict: false }), true, undefined)).toBe(false)
    })
  })

  describe("nesting limit", () => {
    const nested = (depth: number) => `${'('.repeat(depth)}SELECT 1${')'.repeat(depth)}`

    it("allows a read wrapped in 20 parentheses", () => {
      expect(allowed(nested(20), 'psql')).toBe(true)
    })

    it("blocks a read wrapped in 21 parentheses", () => {
      expect(allowed(nested(21), 'psql')).toBe(false)
    })
  })

  it("blocks when re-identifying the statement throws", () => {
    const statements = identify("(SELECT 1)", { strict: false, dialect: 'generic' })
    expect(isAllowedReadOnlyQuery(statements, true, 'not-a-dialect' as Dialect)).toBe(false)
  })
})
