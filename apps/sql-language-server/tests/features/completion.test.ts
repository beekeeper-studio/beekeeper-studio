import { describe, it, expect, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { provideCompletion } from "@/server/features/completion";
import { LezerParser } from "@/server/parsing/LezerParser";
import { SchemaProvider } from "@/server/schema/SchemaProvider";
import { CompletionItemKind } from "vscode-languageserver/browser";

/**
 * Tests for the completion feature use a stub SchemaCache-shaped object
 * directly — we don't need a real LSP connection to exercise the dispatch
 * logic. The cache shape is duck-typed in the completion code.
 */
class StubSchema {
  private tables = new Map<string, { name: string; kind?: string }[]>();
  private columns = new Map<
    string,
    { name: string; dataType?: string }[]
  >();
  private defaultSchemaValue: string | undefined = undefined;

  setTables(schema: string | undefined, tables: { name: string; kind?: string }[]) {
    this.tables.set(schema ?? "__default__", tables);
  }
  setColumns(table: string, schema: string | undefined, cols: { name: string; dataType?: string }[]) {
    this.columns.set(`${schema ?? ""}::${table}`, cols);
  }

  async getSchemas() { return [...this.tables.keys()].filter((k) => k !== "__default__"); }
  async getTables(schema?: string) { return this.tables.get(schema ?? "__default__") ?? []; }
  async getColumns(table: string, schema?: string) {
    return this.columns.get(`${schema ?? ""}::${table}`) ?? [];
  }
  async getDefaultSchema() { return this.defaultSchemaValue; }
}

const parser = new LezerParser();

function docAndOffset(sql: string) {
  const cursor = sql.indexOf("|");
  const text = cursor >= 0 ? sql.replace("|", "") : sql;
  const offset = cursor >= 0 ? cursor : text.length;
  const doc = TextDocument.create("file:///t.sql", "sql", 1, text);
  return { doc, offset, position: doc.positionAt(offset) };
}

describe("provideCompletion", () => {
  let schema: StubSchema;

  beforeEach(() => {
    schema = new StubSchema();
    schema.setTables(undefined, [
      { name: "users", kind: "table" },
      { name: "orders", kind: "table" },
    ]);
    schema.setColumns("users", undefined, [
      { name: "id", dataType: "int" },
      { name: "name", dataType: "varchar" },
    ]);
    schema.setColumns("orders", undefined, [
      { name: "id", dataType: "int" },
      { name: "user_id", dataType: "int" },
      { name: "total", dataType: "numeric" },
    ]);
  });

  it("offers tables after FROM", async () => {
    const { doc, position } = docAndOffset("SELECT * FROM |");
    const items = await provideCompletion(
      doc,
      { textDocument: { uri: doc.uri }, position },
      parser,
      "ansi",
      schema as any
    );
    const tableLabels = items
      .filter((i) => i.kind === CompletionItemKind.Class)
      .map((i) => i.label);
    expect(tableLabels).toEqual(expect.arrayContaining(["users", "orders"]));
  });

  it("offers columns after SELECT with known FROM", async () => {
    const { doc, position } = docAndOffset("SELECT | FROM users");
    const items = await provideCompletion(
      doc,
      { textDocument: { uri: doc.uri }, position },
      parser,
      "ansi",
      schema as any
    );
    const colLabels = items
      .filter((i) => i.kind === CompletionItemKind.Field)
      .map((i) => i.label);
    expect(colLabels).toEqual(expect.arrayContaining(["id", "name"]));
  });

  it("offers columns of the alias-qualified table after `<alias>.`", async () => {
    const { doc, position } = docAndOffset("SELECT u.| FROM users u");
    const items = await provideCompletion(
      doc,
      { textDocument: { uri: doc.uri }, position },
      parser,
      "ansi",
      schema as any
    );
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["id", "name"]));
    // Should NOT include orders columns.
    expect(labels).not.toContain("user_id");
  });

  it("offers keywords on an empty document", async () => {
    const { doc, position } = docAndOffset("|");
    const items = await provideCompletion(
      doc,
      { textDocument: { uri: doc.uri }, position },
      parser,
      "ansi",
      schema as any
    );
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["SELECT", "INSERT INTO"]));
  });

  it("offers WHERE-clause columns from joined tables", async () => {
    const { doc, position } = docAndOffset(
      "SELECT * FROM users u JOIN orders o ON u.id = o.user_id WHERE |"
    );
    const items = await provideCompletion(
      doc,
      { textDocument: { uri: doc.uri }, position },
      parser,
      "ansi",
      schema as any
    );
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["id", "name", "total"]));
  });
});
