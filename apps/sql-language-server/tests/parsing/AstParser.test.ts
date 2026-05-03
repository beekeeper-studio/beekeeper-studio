import { describe, it, expect } from "vitest";
import { AstParser } from "@/server/parsing/AstParser";

const ast = new AstParser();

describe("AstParser", () => {
  it("extracts tables and columns from a clean SELECT", () => {
    const r = ast.analyze("SELECT id, name FROM users", "postgres");
    expect(r.ok).toBe(true);
    expect(r.tables.map((t) => t.name)).toContain("users");
    expect(r.columns.map((c) => c.name)).toEqual(
      expect.arrayContaining(["id", "name"])
    );
  });

  it("handles JOINs", () => {
    const r = ast.analyze(
      "SELECT u.id, o.total FROM users u JOIN orders o ON u.id = o.user_id",
      "postgres"
    );
    expect(r.ok).toBe(true);
    expect(r.tables.map((t) => t.name).sort()).toEqual(["orders", "users"]);
  });

  it("does not throw on broken SQL", () => {
    const r = ast.analyze("SELECT * FRO users", "postgres");
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("works for mysql dialect", () => {
    const r = ast.analyze(
      "SELECT `id` FROM `users` WHERE `name` = 'x'",
      "mysql"
    );
    expect(r.ok).toBe(true);
    expect(r.tables.map((t) => t.name)).toContain("users");
  });

  it("works for sqlite dialect", () => {
    const r = ast.analyze("SELECT id FROM users", "sqlite");
    expect(r.ok).toBe(true);
  });
});
