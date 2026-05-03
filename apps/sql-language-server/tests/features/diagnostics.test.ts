import { describe, it, expect, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideDiagnostics } from "@/server/features/diagnostics";
import { LezerParser } from "@/server/parsing/LezerParser";
import { AstParser } from "@/server/parsing/AstParser";

class StubSchema {
  private tables = new Map<string, { name: string; kind?: string }[]>();
  private columns = new Map<string, { name: string }[]>();
  setTables(schema: string | undefined, t: { name: string; kind?: string }[]) {
    this.tables.set(schema ?? "__default__", t);
  }
  setColumns(table: string, schema: string | undefined, c: { name: string }[]) {
    this.columns.set(`${schema ?? ""}::${table}`, c);
  }
  async getSchemas() { return []; }
  async getTables(schema?: string) { return this.tables.get(schema ?? "__default__") ?? []; }
  async getColumns(table: string, schema?: string) {
    return this.columns.get(`${schema ?? ""}::${table}`) ?? [];
  }
  async getDefaultSchema() { return undefined; }
}

const parser = new LezerParser();
const ast = new AstParser();

function makeDoc(sql: string) {
  return TextDocument.create("file:///t.sql", "sql", 1, sql);
}

describe("provideDiagnostics", () => {
  let schema: StubSchema;

  beforeEach(() => {
    schema = new StubSchema();
    schema.setTables(undefined, [{ name: "users" }]);
    schema.setColumns("users", undefined, [
      { name: "id" },
      { name: "name" },
    ]);
  });

  it("reports no diagnostics for clean SQL with known schema", async () => {
    const doc = makeDoc("SELECT id, name FROM users");
    const diags = await provideDiagnostics(doc, parser, ast, "postgres", schema as any);
    expect(diags.filter((d) => d.severity === 1)).toHaveLength(0); // no errors
  });

  it("reports a syntax error when Lezer flags one (unbalanced parens)", async () => {
    // Lezer's SQL grammar is lenient, but unbalanced parens it does flag.
    const doc = makeDoc("SELECT (1 + 2 FROM users");
    const diags = await provideDiagnostics(doc, parser, ast, "postgres", schema as any);
    expect(diags.some((d) => d.severity === 1)).toBe(true);
  });

  it("does NOT report a semantic error while the user is mid-typing", async () => {
    const doc = makeDoc("SELECT * FROM ");
    const diags = await provideDiagnostics(doc, parser, ast, "postgres", schema as any);
    // Should be a syntax error (incomplete), not a semantic one.
    const semanticErrors = diags.filter((d) =>
      d.message?.startsWith("Unknown")
    );
    expect(semanticErrors).toHaveLength(0);
  });

  it("flags an unknown table on a complete statement", async () => {
    const doc = makeDoc("SELECT * FROM nonexistent");
    const diags = await provideDiagnostics(doc, parser, ast, "postgres", schema as any);
    expect(
      diags.some((d) => d.message.includes("nonexistent"))
    ).toBe(true);
  });

  it("flags an unknown column on a known table", async () => {
    const doc = makeDoc("SELECT bogus FROM users");
    const diags = await provideDiagnostics(doc, parser, ast, "postgres", schema as any);
    expect(
      diags.some((d) => d.message.toLowerCase().includes("bogus"))
    ).toBe(true);
  });
});
