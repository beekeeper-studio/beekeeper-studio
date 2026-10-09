import { describe, it, expect } from "vitest"
import { describeDangerousQueries, findDangerousQueries, hasTopLevelWhere } from "@/lib/db/dangerousQueries"

describe("findDangerousQueries", () => {
  it.each([
    ["DELETE FROM users", "DELETE"],
    ["delete from users;", "DELETE"],
    ["UPDATE users SET active = false", "UPDATE"],
    ["update public.users set active = false returning *", "UPDATE"],
    ["  -- tidy up\n DELETE FROM users", "DELETE"],
  ])("flags %j", (sql, type) => {
    expect(findDangerousQueries(sql, "psql").map((q) => q.type)).toEqual([type])
  })

  it.each([
    "DELETE FROM users WHERE id = 1",
    "update users set active = false where id in (select id from banned)",
    "UPDATE users SET active = false\nWHERE\n  id = 1",
    "SELECT * FROM users",
    "INSERT INTO users (name) VALUES ('where')",
    "INSERT INTO users (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET name = 'x'",
    "TRUNCATE users",
    "",
    "   ",
  ])("ignores %j", (sql) => {
    expect(findDangerousQueries(sql, "psql")).toEqual([])
  })

  it("only returns the unscoped statements from a script", () => {
    const sql = "select 1; update users set a = 1 where id = 2; delete from users; update orders set b = 2"
    expect(findDangerousQueries(sql, "psql").map((q) => q.text)).toEqual([
      "delete from users;",
      "update orders set b = 2",
    ])
  })

  it("flags a statement whose only WHERE is inside a CTE", () => {
    const sql = "WITH old AS (SELECT id FROM users WHERE created < now()) DELETE FROM users"
    expect(findDangerousQueries(sql, "psql")).toHaveLength(1)
  })

  it("flags an update whose only WHERE is inside a subquery", () => {
    const sql = "UPDATE users SET plan = (SELECT id FROM plans WHERE name = 'free')"
    expect(findDangerousQueries(sql, "psql")).toHaveLength(1)
  })
})

describe("hasTopLevelWhere", () => {
  it.each([
    ["DELETE FROM t -- where id = 1", "psql"],
    ["DELETE FROM t /* where id = 1 */", "psql"],
    ["DELETE FROM t # where id = 1", "mysql"],
    ["UPDATE t SET a = 'where'", "psql"],
    ["UPDATE t SET a = 'it''s where'", "psql"],
    ["UPDATE t SET a = 'it\\'s where'", "mysql"],
    ["UPDATE t SET \"where\" = 1", "psql"],
    ["UPDATE t SET `where` = 1", "mysql"],
    ["UPDATE t SET [where] = 1", "mssql"],
    ["UPDATE t SET a = $$ where $$", "psql"],
    ["UPDATE t SET a = $body$ where $body$", "psql"],
    ["UPDATE t SET a = @where", "mssql"],
    ["UPDATE t SET nowhere = 1, where_clause = 2", "psql"],
    ["DELETE FROM t /* unterminated where", "psql"],
  ])("ignores WHERE that isn't a clause: %j (%s)", (sql, dialect: any) => {
    expect(hasTopLevelWhere(sql, dialect)).toBe(false)
  })

  it.each([
    ["DELETE FROM t WHERE id = 1", "psql"],
    ["delete from t where id = 1", "generic"],
    ["UPDATE t SET a = $1 WHERE id = $2", "psql"],
    ["UPDATE t SET a = 'x' -- comment\nWHERE id = 1", "psql"],
    ["UPDATE t SET a = 1 WHERE id = 1 # trailing", "mysql"],
    ["UPDATE t SET a = (1) WHERE id = 1", "psql"],
    ["DELETE FROM t WHERE CURRENT OF c", "psql"],
  ])("finds the WHERE clause in %j (%s)", (sql, dialect: any) => {
    expect(hasTopLevelWhere(sql, dialect)).toBe(true)
  })
})

describe("describeDangerousQueries", () => {
  it("describes a single query", () => {
    expect(describeDangerousQueries([{ type: "DELETE", text: "delete from t" }])).toEqual({
      title: "You did not scope this query",
      detail: "This will delete every record on this table.",
    })
  })

  it("describes several queries", () => {
    expect(describeDangerousQueries([
      { type: "UPDATE", text: "update a set x = 1" },
      { type: "DELETE", text: "delete from b" },
      { type: "UPDATE", text: "update c set y = 1" },
    ])).toEqual({
      title: "You did not scope 3 queries",
      detail: "These queries will update and delete every record on their tables.",
    })
  })
})
