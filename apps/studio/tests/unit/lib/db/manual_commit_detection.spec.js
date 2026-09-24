import { safelyIdentify } from "../../../../src/lib/db/sql_tools";

// TabQueryEditor.submitQuery flips a query tab into manual-commit mode when the
// submitted SQL opens more transactions than it closes:
//
//   identification.some((q) => q.executionType === "TRANSACTION")
//     && count(type === "BEGIN_TRANSACTION") > count(type === "COMMIT" || type === "ROLLBACK")
//
// For SQL Server connections the editor identifies with the "mssql" dialect
// (see TabQueryEditor.identifyDialect). These tests pin down that T-SQL
// transaction statements — including the abbreviated BEGIN TRAN — are
// classified so the editor enters (and leaves) manual-commit mode correctly.
function wouldEnterManualCommit(queryText, dialect) {
  const { queries, error } = safelyIdentify(queryText, {
    dialect,
    identifyTables: true,
    identifyColumns: true,
  });
  expect(error).toBeNull();
  if (!queries.some((q) => q.executionType === "TRANSACTION")) return false;
  const begins = queries.filter((q) => q.type === "BEGIN_TRANSACTION").length;
  const ends = queries.filter(
    (q) => q.type === "COMMIT" || q.type === "ROLLBACK"
  ).length;
  return begins > ends;
}

describe("Manual commit mode detection (mssql dialect)", () => {
  const entering = [
    "BEGIN TRAN",
    "BEGIN TRAN;",
    "begin tran",
    "BEGIN TRANSACTION",
    "BEGIN TRANSACTION;",
    "BEGIN TRAN my_tran",
    "BEGIN TRANSACTION my_tran;",
    "BEGIN TRAN;\nINSERT INTO foo (id) VALUES (1);",
    "BEGIN TRAN;\nUPDATE foo SET name = 'x' WHERE id = 1;",
  ];

  entering.forEach((sql) => {
    it(`should enter manual commit mode for ${JSON.stringify(sql)}`, () => {
      expect(wouldEnterManualCommit(sql, "mssql")).toBe(true);
    });
  });

  const notEntering = [
    // balanced scripts commit/roll back everything they open
    "BEGIN TRAN;\nINSERT INTO foo (id) VALUES (1);\nCOMMIT;",
    "BEGIN TRANSACTION;\nDELETE FROM foo;\nROLLBACK;",
    "BEGIN TRAN;\nINSERT INTO foo (id) VALUES (1);\nCOMMIT TRAN;",
    // closing statements alone leave the mode untouched (handled by the
    // endTransaction > startTransaction branch instead)
    "COMMIT",
    "COMMIT TRAN",
    "ROLLBACK",
    "ROLLBACK TRANSACTION",
    // plain statements
    "SELECT * FROM foo",
    "INSERT INTO foo (id) VALUES (1)",
  ];

  notEntering.forEach((sql) => {
    it(`should not enter manual commit mode for ${JSON.stringify(sql)}`, () => {
      expect(wouldEnterManualCommit(sql, "mssql")).toBe(false);
    });
  });

  it("should classify COMMIT and ROLLBACK as transaction-closing statements", () => {
    // isManualCommit && hasActiveTransaction && ends > begins toggles the tab
    // back to auto-commit; make sure both closers identify as such.
    for (const sql of ["COMMIT", "COMMIT TRANSACTION", "ROLLBACK", "ROLLBACK TRAN"]) {
      const { queries, error } = safelyIdentify(sql, { dialect: "mssql" });
      expect(error).toBeNull();
      expect(queries).toHaveLength(1);
      expect(queries[0].executionType).toBe("TRANSACTION");
      expect(["COMMIT", "ROLLBACK"]).toContain(queries[0].type);
    }
  });
});
