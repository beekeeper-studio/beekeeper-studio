import { describe, it, expect } from "vitest";
import {
  splitStatements,
  statementAt,
} from "@/server/parsing/StatementSplitter";

describe("splitStatements", () => {
  it("splits multiple statements on semicolons", () => {
    const text = "SELECT 1; SELECT 2; SELECT 3";
    const stmts = splitStatements(text, "ansi");
    expect(stmts.length).toBeGreaterThanOrEqual(2);
  });

  it("returns the whole text as a single statement when there is one", () => {
    const stmts = splitStatements("SELECT * FROM users", "postgres");
    expect(stmts).toHaveLength(1);
    expect(stmts[0].text).toContain("SELECT");
  });

  it("does not throw on broken input", () => {
    const stmts = splitStatements("not really sql at all", "ansi");
    expect(stmts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("statementAt", () => {
  it("finds the statement containing an offset", () => {
    const text = "SELECT 1;\nSELECT 2";
    const stmts = splitStatements(text, "ansi");
    const at = statementAt(stmts, text.indexOf("SELECT 2"));
    expect(at?.text).toContain("SELECT 2");
  });
});
