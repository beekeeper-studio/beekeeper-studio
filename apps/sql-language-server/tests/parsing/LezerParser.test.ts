import { describe, it, expect } from "vitest";
import { LezerParser } from "@/server/parsing/LezerParser";

const parser = new LezerParser();

describe("LezerParser", () => {
  describe("parse() — error tolerance", () => {
    it("parses complete SELECT", () => {
      const tree = parser.parse("SELECT id, name FROM users", "ansi");
      expect(tree).toBeDefined();
      const errs = parser.errors(tree, "SELECT id, name FROM users");
      expect(errs).toHaveLength(0);
    });

    it("returns a tree even when input ends mid-statement", () => {
      // Lezer's SQL grammar is permissive — it accepts "SELECT * FROM " as
      // valid (no error nodes). The contract here is that we get a usable
      // tree without throwing, so completion can still operate.
      const sql = "SELECT * FROM ";
      const tree = parser.parse(sql, "ansi");
      expect(tree).toBeDefined();
      expect(tree.length).toBe(sql.length);
    });

    it("returns a tree for SELECT with trailing comma", () => {
      const sql = "SELECT id, FROM users";
      const tree = parser.parse(sql, "ansi");
      expect(tree).toBeDefined();
    });

    it("returns a tree for unbalanced parens (and flags error nodes)", () => {
      // This case Lezer *does* flag.
      const sql = "SELECT (1 + 2 FROM t";
      const tree = parser.parse(sql, "ansi");
      expect(tree).toBeDefined();
      const errs = parser.errors(tree, sql);
      expect(errs.length).toBeGreaterThan(0);
    });
  });

  describe("contextAt()", () => {
    it("identifies FROM context", () => {
      const sql = "SELECT id FROM ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      expect(ctx.clause).toBe("from");
    });

    it("identifies SELECT context after a comma", () => {
      const sql = "SELECT id, ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      expect(ctx.clause).toBe("select");
    });

    it("identifies WHERE context", () => {
      const sql = "SELECT * FROM users WHERE ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      expect(ctx.clause).toBe("where");
    });

    it("identifies JOIN context", () => {
      const sql = "SELECT * FROM users u JOIN ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      expect(ctx.clause).toBe("join");
    });

    it("detects after-dot for qualified references", () => {
      const sql = "SELECT u. FROM users u";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, "SELECT u.".length);
      expect(ctx.afterDot).toBe(true);
      expect(ctx.qualifier).toBe("u");
    });

    it("collects in-scope tables and aliases from FROM", () => {
      const sql = "SELECT * FROM users u WHERE ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      expect(ctx.tablesInScope).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "u", table: "users" }),
        ])
      );
    });

    it("collects multiple tables across FROM and JOIN", () => {
      const sql =
        "SELECT * FROM users u JOIN orders o ON u.id = o.user_id WHERE ";
      const tree = parser.parse(sql, "ansi");
      const ctx = parser.contextAt(tree, sql, sql.length);
      const names = ctx.tablesInScope.map((t) => t.name);
      expect(names).toEqual(expect.arrayContaining(["u", "o"]));
    });
  });

  describe("dialect handling", () => {
    it("parses Postgres-specific syntax without erroring", () => {
      const sql = "SELECT id::text FROM users";
      const tree = parser.parse(sql, "postgres");
      expect(tree).toBeDefined();
    });

    it("parses MySQL backtick identifiers", () => {
      const sql = "SELECT `id` FROM `users`";
      const tree = parser.parse(sql, "mysql");
      expect(tree).toBeDefined();
      const errs = parser.errors(tree, sql);
      expect(errs).toHaveLength(0);
    });
  });
});
