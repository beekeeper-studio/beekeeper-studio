import { describe, it, expect } from "vitest";
import { Dialect } from "sql-query-identifier";
import { safelyIdentify } from "@/lib/db/sql_tools";
import {
  findUnfilteredWrites,
  hasOwnWhereClause,
  shouldWarnOnUnfilteredWrites,
  statementExcerpt,
  unfilteredWritesMessage,
} from "@/lib/db/unfilteredWrites";

function unfiltered(sql: string, dialect: Dialect = "generic") {
  const { queries } = safelyIdentify(sql, { dialect });
  return findUnfilteredWrites(queries, dialect).map((q) => q.text.trim());
}

describe("findUnfilteredWrites", () => {
  it.each([
    "DELETE FROM users",
    "delete from users;",
    "UPDATE users SET active = false",
    "update users set active = false;",
  ])("finds %s", (sql) => {
    expect(unfiltered(sql)).toEqual([sql]);
  });

  it.each([
    "DELETE FROM users WHERE id = 1",
    "UPDATE users SET active = false WHERE id = 1",
    "update users set active = false\nwhere id = 1",
    "SELECT * FROM users",
    "INSERT INTO users (id) VALUES (1)",
    "TRUNCATE users",
  ])("leaves %s alone", (sql) => {
    expect(unfiltered(sql)).toEqual([]);
  });

  it("finds only the unfiltered statements of several", () => {
    expect(
      unfiltered(
        "UPDATE a SET x = 1 WHERE id = 1; DELETE FROM b; SELECT 1; UPDATE c SET y = 2;"
      )
    ).toEqual(["DELETE FROM b;", "UPDATE c SET y = 2;"]);
  });

  // A LIMIT or TOP caps how many rows change, not which ones.
  it.each<[string, Dialect]>([
    ["DELETE FROM users LIMIT 10", "mysql"],
    ["UPDATE users SET a = 1 ORDER BY id LIMIT 1", "mysql"],
    ["DELETE TOP (10) FROM users", "mssql"],
  ])("does not count a limit as a filter: %s", (sql, dialect) => {
    expect(unfiltered(sql, dialect)).toHaveLength(1);
  });

  it("finds an unfiltered DELETE behind a CTE that has a WHERE", () => {
    expect(
      unfiltered(
        "WITH old AS (SELECT id FROM users WHERE created < now()) DELETE FROM users",
        "psql"
      )
    ).toHaveLength(1);
  });

  it("leaves a DELETE behind a CTE alone when it has its own WHERE", () => {
    expect(
      unfiltered(
        "WITH old AS (SELECT id FROM users) DELETE FROM users WHERE id IN (SELECT id FROM old)",
        "psql"
      )
    ).toEqual([]);
  });
});

describe("hasOwnWhereClause", () => {
  it.each<[string, string, Dialect?]>([
    ["a subquery", "UPDATE t SET a = (SELECT max(b) FROM u WHERE u.id = 1)"],
    ["a string", "UPDATE t SET note = 'where it was'"],
    ["a doubled quote in a string", "UPDATE t SET note = 'it''s where'"],
    ["a quoted identifier", 'UPDATE t SET "where" = 1'],
    ["a backtick identifier", "UPDATE t SET `where` = 1", "mysql"],
    ["a bracketed identifier", "UPDATE t SET [where] = 1", "mssql"],
    ["a line comment", "DELETE FROM t -- where id = 1"],
    ["a hash comment", "DELETE FROM t # where id = 1", "mysql"],
    ["a block comment", "DELETE FROM t /* where id = 1 */"],
    ["a dollar-quoted string", "UPDATE t SET body = $$ where $$", "psql"],
    ["a tagged dollar-quoted string", "UPDATE t SET body = $x$ where $x$", "psql"],
    ["a backslash-escaped quote", "UPDATE t SET a = 'it\\' where'", "mysql"],
    ["an E string", "UPDATE t SET a = E'it\\' where'", "psql"],
    ["a longer word", "UPDATE t SET somewhere = 1, whereabouts = 2"],
  ])("ignores a WHERE in %s", (_label, sql, dialect) => {
    expect(hasOwnWhereClause(sql, dialect)).toBe(false);
  });

  it.each<[string, string, Dialect?]>([
    ["after a subquery", "UPDATE t SET a = (SELECT 1) WHERE id = 1"],
    ["after a string", "UPDATE t SET a = 'x' WHERE id = 1"],
    ["after a comment", "DELETE FROM t -- old rows\nWHERE id = 1"],
    ["after a dollar quote", "UPDATE t SET a = $$x$$ WHERE id = 1", "psql"],
    ["after a positional parameter", "UPDATE t SET a = $1 WHERE id = $2", "psql"],
    ["in lower case", "delete from t where id = 1"],
  ])("finds a WHERE %s", (_label, sql, dialect) => {
    expect(hasOwnWhereClause(sql, dialect)).toBe(true);
  });
});

describe("shouldWarnOnUnfilteredWrites", () => {
  it.each<[unknown, boolean, boolean]>([
    ["always", false, true],
    ["always", true, true],
    ["production", false, false],
    ["production", true, true],
    ["never", true, false],
    [" Production ", true, true],
    // a missing or unknown value warns, rather than silently not
    [undefined, false, true],
    ["sometimes", false, true],
  ])("%s on a production connection? %s => %s", (setting, isProduction, expected) => {
    expect(shouldWarnOnUnfilteredWrites(setting, isProduction)).toBe(expected);
  });
});

describe("the warning message", () => {
  it("names a single statement", () => {
    const [statement] = safelyIdentify("DELETE FROM users;", { dialect: "generic" }).queries;
    expect(unfilteredWritesMessage([statement])).toBe(
      "DELETE FROM users has no WHERE clause, so it can change every row in the table."
    );
  });

  it("lists several statements", () => {
    const { queries } = safelyIdentify("DELETE FROM a; UPDATE b SET x = 1;", { dialect: "generic" });
    expect(unfilteredWritesMessage(queries)).toBe(
      "2 statements have no WHERE clause, so they can change every row in their tables: DELETE FROM a; UPDATE b SET x = 1"
    );
  });

  it("puts a statement on one line and cuts a long one", () => {
    expect(statementExcerpt("UPDATE t\n  SET a = 1")).toBe("UPDATE t SET a = 1");
    expect(statementExcerpt(`UPDATE t SET a = '${"x".repeat(100)}'`)).toHaveLength(80);
  });
});
