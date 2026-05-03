/**
 * End-to-end integration test:
 *   - sql.js holds a real SQLite database with three tables
 *   - SqliteSchemaProvider answers schema queries against that DB
 *   - LspServer runs over a MessagePort pair (no Worker, but same wire)
 *   - HostSchemaBridge answers `bks/schema/*` requests from the worker
 *   - A test-side LSP client sends initialize / didOpen / completion / etc.
 *
 * The point of this test is to prove the full pipeline works against a
 * real database, not a stubbed one — completion items have to come back
 * containing the actual columns sql.js reports.
 *
 * Wire layout:
 *
 *   server side (one Connection)  <----MessageChannel---->  host side (one Connection)
 *                                                              |
 *                                                              +-- HostSchemaBridge handlers
 *                                                              +-- LSP client handlers (publishDiagnostics etc.)
 *                                                              +-- LSP requests (initialize, completion, ...)
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import initSqlJs, { Database } from "sql.js";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createMessageConnection,
  MessageConnection,
} from "vscode-jsonrpc/browser";
import {
  BrowserMessageReader as ServerReader,
  BrowserMessageWriter as ServerWriter,
  createConnection,
} from "vscode-languageserver/browser";
import {
  CompletionItem,
  CompletionItemKind,
  Diagnostic,
  PublishDiagnosticsParams,
} from "vscode-languageserver-protocol";

import { LspServer } from "@/server/LspServer";
import { HostSchemaBridge } from "@/client/HostSchemaBridge";
import { SqliteSchemaProvider } from "../../examples/_shared/SqliteSchemaProvider";
import { SAMPLE_SCHEMA_SQL } from "../../examples/_shared/sampleSchema";
import { PortAsWorker } from "../_helpers/portAsWorker";

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

beforeAll(async () => {
  SQL = await initSqlJs();
});

interface Harness {
  client: MessageConnection;
  bridge: HostSchemaBridge;
  diagnostics: Map<string, Diagnostic[]>;
  dispose(): void;
}

function setupHarness(db: Database): Harness {
  const channel = new MessageChannel();
  const serverWorker = new PortAsWorker(channel.port1);
  const hostWorker = new PortAsWorker(channel.port2);

  // --- Server side (would normally be inside a Worker) ---
  const serverReader = new ServerReader(serverWorker as any);
  const serverWriter = new ServerWriter(serverWorker as any);
  const serverConnection = createConnection(serverReader, serverWriter);
  new LspServer(serverConnection).start();

  // --- Host side: ONE shared MessageConnection ---
  // Build the connection ourselves so the bridge AND the test-side LSP
  // client can both register handlers on the same connection.
  const hostReader = new BrowserMessageReader(hostWorker as any);
  const hostWriter = new BrowserMessageWriter(hostWorker as any);
  const client = createMessageConnection(hostReader, hostWriter);

  const provider = new SqliteSchemaProvider(db);
  const bridge = HostSchemaBridge.fromConnection(client, provider);

  // Capture publishDiagnostics so tests can assert on them.
  const diagnostics = new Map<string, Diagnostic[]>();
  client.onNotification(
    "textDocument/publishDiagnostics",
    (params: PublishDiagnosticsParams) => {
      diagnostics.set(params.uri, params.diagnostics);
    }
  );

  // The server registers a dynamic capability after `initialized`. A real
  // LSP client handles `client/registerCapability`; we just acknowledge.
  client.onRequest("client/registerCapability", () => null);
  client.onRequest("client/unregisterCapability", () => null);
  // workspace/configuration: server may ask for the client's settings;
  // returning null per item is the well-defined "no settings" response.
  client.onRequest(
    "workspace/configuration",
    (params: { items: unknown[] }) => params.items.map(() => null)
  );

  client.listen();

  return {
    client,
    bridge,
    diagnostics,
    dispose() {
      bridge.dispose();
      client.dispose();
      serverWorker.terminate();
      hostWorker.terminate();
    },
  };
}

async function initialise(client: MessageConnection, dialect = "sqlite"): Promise<void> {
  await client.sendRequest("initialize", {
    processId: null,
    rootUri: "file:///test",
    capabilities: {},
    initializationOptions: { dialect },
  });
  await client.sendNotification("initialized", {});
}

async function openDoc(
  client: MessageConnection,
  uri: string,
  text: string
): Promise<void> {
  await client.sendNotification("textDocument/didOpen", {
    textDocument: { uri, languageId: "sql", version: 1, text },
  });
}

async function changeDoc(
  client: MessageConnection,
  uri: string,
  text: string,
  version: number
): Promise<void> {
  await client.sendNotification("textDocument/didChange", {
    textDocument: { uri, version },
    contentChanges: [{ text }],
  });
}

async function complete(
  client: MessageConnection,
  uri: string,
  position: { line: number; character: number }
): Promise<CompletionItem[]> {
  const result = await client.sendRequest<CompletionItem[] | { items: CompletionItem[] } | null>(
    "textDocument/completion",
    { textDocument: { uri }, position }
  );
  if (Array.isArray(result)) return result;
  return result?.items ?? [];
}

async function waitForDiagnostics(
  diags: Map<string, Diagnostic[]>,
  uri: string,
  predicate: (d: Diagnostic[]) => boolean = () => true,
  timeoutMs = 1500
): Promise<Diagnostic[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (diags.has(uri) && predicate(diags.get(uri)!)) {
      return diags.get(uri)!;
    }
    await new Promise((r) => setTimeout(r, 30));
  }
  if (diags.has(uri)) return diags.get(uri)!;
  throw new Error(`No diagnostics for ${uri} within ${timeoutMs}ms`);
}

describe("end-to-end LSP server + SQLite-backed schema", () => {
  let db: Database;
  let harness: Harness;
  const URI = "file:///test/query.sql";

  beforeAll(() => {
    db = new SQL.Database();
    db.exec(SAMPLE_SCHEMA_SQL);
  });

  afterEach(() => {
    harness?.dispose();
  });

  it("round-trips initialize + completion against the real SQLite schema", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    const text = "SELECT * FROM ";
    await openDoc(harness.client, URI, text);

    const items = await complete(harness.client, URI, {
      line: 0,
      character: text.length,
    });
    const tables = items
      .filter((i) => i.kind === CompletionItemKind.Class)
      .map((i) => i.label);

    // These are the actual tables in the SQLite database via sqlite_master.
    expect(tables).toEqual(
      expect.arrayContaining(["users", "orders", "order_items"])
    );
  });

  it("returns columns from PRAGMA table_info() after `<alias>.`", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    const text = "SELECT u. FROM users u";
    await openDoc(harness.client, URI, text);

    const items = await complete(harness.client, URI, {
      line: 0,
      character: "SELECT u.".length,
    });
    const labels = items.map((i) => i.label);

    // Real columns from the actual users table.
    expect(labels).toEqual(
      expect.arrayContaining(["id", "name", "email", "created_at"])
    );
    // Should not leak columns from other tables.
    expect(labels).not.toContain("total");
    expect(labels).not.toContain("product_name");
  });

  it("offers cross-table columns when multiple tables are joined", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    const text =
      "SELECT * FROM users u JOIN orders o ON u.id = o.user_id WHERE ";
    await openDoc(harness.client, URI, text);

    const items = await complete(harness.client, URI, {
      line: 0,
      character: text.length,
    });
    const labels = items.map((i) => i.label);

    // Columns from BOTH joined tables should be available.
    expect(labels).toEqual(expect.arrayContaining(["email", "total"]));
  });

  it("publishes a diagnostic for an unknown column", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    await openDoc(harness.client, URI, "SELECT bogus_column FROM users");
    const diags = await waitForDiagnostics(harness.diagnostics, URI, (ds) =>
      ds.some((d) => d.message.includes("bogus_column"))
    );

    expect(
      diags.some((d) => d.message.toLowerCase().includes("bogus_column"))
    ).toBe(true);
  });

  it("publishes a diagnostic for an unknown table", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    await openDoc(harness.client, URI, "SELECT * FROM nonexistent_table");
    const diags = await waitForDiagnostics(harness.diagnostics, URI, (ds) =>
      ds.some((d) => d.message.includes("nonexistent_table"))
    );

    expect(
      diags.some((d) => d.message.includes("nonexistent_table"))
    ).toBe(true);
  });

  it("clears warnings after the document is corrected", async () => {
    harness = setupHarness(db);
    await initialise(harness.client);

    await openDoc(harness.client, URI, "SELECT bogus FROM users");
    await waitForDiagnostics(harness.diagnostics, URI, (ds) =>
      ds.some((d) => d.message.includes("bogus"))
    );

    // Reset captured diagnostics so we can detect the new push.
    harness.diagnostics.delete(URI);
    await changeDoc(harness.client, URI, "SELECT name FROM users", 2);

    const after = await waitForDiagnostics(harness.diagnostics, URI);
    // Warnings (severity 2) should be empty for the corrected document.
    expect(after.filter((d) => d.severity === 2)).toHaveLength(0);
  });

  it("respects schema invalidation when the host signals a change", async () => {
    // Use a fresh DB so we can mutate it without affecting the shared `db`.
    const localDb = new SQL.Database();
    localDb.exec(SAMPLE_SCHEMA_SQL);
    harness = setupHarness(localDb);
    await initialise(harness.client);

    // First completion request — caches the table list.
    await openDoc(harness.client, URI, "SELECT * FROM ");
    const before = (
      await complete(harness.client, URI, { line: 0, character: 14 })
    ).map((i) => i.label);
    expect(before).toContain("users");

    // Mutate schema and tell the worker its cache is stale.
    localDb.exec("CREATE TABLE freshly_added_table (id INTEGER PRIMARY KEY)");
    harness.bridge.invalidate();

    const after = (
      await complete(harness.client, URI, { line: 0, character: 14 })
    ).map((i) => i.label);
    expect(after).toContain("freshly_added_table");
  });
});
