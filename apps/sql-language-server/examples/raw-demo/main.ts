/**
 * Raw LSP demo — no CodeMirror.
 *
 * Boots the worker, sends `initialize`, `textDocument/didOpen` and
 * `textDocument/didChange` as the user edits the textarea, and on demand
 * sends `textDocument/completion` or waits for `textDocument/publishDiagnostics`.
 *
 * Each on-the-wire message is logged so you can see exactly what the
 * server is asked and what it answers. Useful for verifying the LSP
 * server in isolation when the CodeMirror integration is misbehaving.
 */

import initSqlJs from "sql.js/dist/sql-wasm.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { SqliteSchemaProvider } from "../_shared/SqliteSchemaProvider";
import { SAMPLE_SCHEMA_SQL } from "../_shared/sampleSchema";

// --- DOM bindings ----------------------------------------------------------

const $status = document.getElementById("status") as HTMLElement;
const $doc = document.getElementById("doc") as HTMLTextAreaElement;
const $position = document.getElementById("position") as HTMLElement;
const $dialect = document.getElementById("dialect") as HTMLSelectElement;
const $suggest = document.getElementById("suggest") as HTMLButtonElement;
const $diagnose = document.getElementById("diagnose") as HTMLButtonElement;
const $schema = document.getElementById("schema") as HTMLElement;
const $request = document.getElementById("request") as HTMLElement;
const $response = document.getElementById("response") as HTMLElement;
const $responseSummary = document.getElementById("response-summary") as HTMLElement;
const $log = document.getElementById("log") as HTMLElement;

const setStatus = (msg: string, kind: "loading" | "ready" | "error" = "loading") => {
  $status.textContent = msg;
  $status.className = kind === "loading" ? "" : kind;
};

const offsetToLineCol = (text: string, offset: number) => {
  let line = 0;
  let lastLineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lastLineStart = i + 1;
    }
  }
  return { line, character: offset - lastLineStart };
};

// --- Wire ------------------------------------------------------------------

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class WorkerWire {
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private notificationHandlers = new Map<string, (params: any) => void>();
  private requestHandlers = new Map<
    string,
    (params: any) => Promise<any> | any
  >();

  constructor(private worker: Worker) {
    worker.addEventListener("message", (e) => {
      const msg = e.data;
      this.logIncoming(msg);
      this.dispatch(msg);
    });
    worker.addEventListener("error", (e) => {
      logErr(`worker error: ${e.message}`);
    });
  }

  onRequest(method: string, handler: (params: any) => Promise<any> | any): void {
    this.requestHandlers.set(method, handler);
  }

  onNotification(method: string, handler: (params: any) => void): void {
    this.notificationHandlers.set(method, handler);
  }

  request<T = any>(method: string, params?: any): Promise<T> {
    const id = this.nextId++;
    const msg = { jsonrpc: "2.0", id, method, params };
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send(msg);
    });
  }

  notification(method: string, params?: any): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  private send(msg: any): void {
    this.logOutgoing(msg);
    this.worker.postMessage(msg);
  }

  private async dispatch(msg: any): Promise<void> {
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
      return;
    }

    if (msg.method && msg.id !== undefined) {
      const handler = this.requestHandlers.get(msg.method);
      if (!handler) {
        this.send({
          jsonrpc: "2.0",
          id: msg.id,
          error: { code: -32601, message: `Method not found: ${msg.method}` },
        });
        return;
      }
      try {
        const result = await handler(msg.params);
        this.send({ jsonrpc: "2.0", id: msg.id, result });
      } catch (e: any) {
        this.send({
          jsonrpc: "2.0",
          id: msg.id,
          error: { code: -32000, message: e?.message ?? String(e) },
        });
      }
      return;
    }

    if (msg.method) {
      const h = this.notificationHandlers.get(msg.method);
      h?.(msg.params);
    }
  }

  private logOutgoing(msg: any): void {
    addLogEntry("→", JSON.stringify(msg), "out");
  }
  private logIncoming(msg: any): void {
    addLogEntry("←", JSON.stringify(msg), "in");
  }
}

const logEntries: { dir: string; payload: string; cls: string }[] = [];
function addLogEntry(dir: string, payload: string, cls: string): void {
  logEntries.push({ dir, payload, cls });
  if (logEntries.length > 200) logEntries.shift();
  renderLog();
}
function logErr(msg: string): void {
  addLogEntry("!", msg, "err");
}
function renderLog(): void {
  $log.innerHTML = logEntries
    .map((e) => `<span class="${e.cls}">${e.dir} ${escapeHtml(e.payload)}</span>`)
    .join("\n");
  $log.scrollTop = $log.scrollHeight;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- App -------------------------------------------------------------------

const URI = "file:///raw-demo/query.sql";
let docVersion = 1;
let lastDiagnostics: any[] | null = null;
let wire: WorkerWire | null = null;

function updatePosition(): void {
  const { line, character } = offsetToLineCol(
    $doc.value,
    $doc.selectionStart
  );
  $position.textContent = `line ${line}, column ${character} (offset ${$doc.selectionStart})`;
}

async function syncDoc(): Promise<void> {
  if (!wire) return;
  docVersion++;
  wire.notification("textDocument/didChange", {
    textDocument: { uri: URI, version: docVersion },
    contentChanges: [{ text: $doc.value }],
  });
}

async function main(): Promise<void> {
  setStatus("Loading sql.js (WASM)…");
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });

  const db = new SQL.Database();
  db.exec(SAMPLE_SCHEMA_SQL);
  const provider = new SqliteSchemaProvider(db);

  // Render schema for the side panel.
  const tables = await provider.getTables();
  const lines: string[] = [];
  for (const t of tables) {
    const cols = await provider.getColumns(t.name);
    lines.push(t.name);
    for (const c of cols) {
      lines.push(`  ${c.name}: ${c.dataType ?? "?"}${c.primaryKey ? "  (pk)" : ""}`);
    }
    lines.push("");
  }
  $schema.textContent = lines.join("\n");

  setStatus("Spawning worker…");
  const worker = new Worker(
    new URL("../../dist/worker.js", import.meta.url),
    { type: "module" }
  );

  wire = new WorkerWire(worker);

  // Schema provider bridge — answer worker's bks/* requests.
  wire.onRequest("bks/schema/getSchemas", async () => ({
    schemas: await provider.getSchemas(),
  }));
  wire.onRequest("bks/schema/getTables", async (params) => ({
    tables: await provider.getTables(params?.schema),
  }));
  wire.onRequest("bks/schema/getColumns", async (params) => ({
    columns: await provider.getColumns(params.table, params.schema),
  }));
  wire.onRequest("bks/schema/getDefaultSchema", async () => ({
    schema: await provider.getDefaultSchema?.(),
  }));

  // The LSP server registers configuration capabilities — acknowledge.
  wire.onRequest("client/registerCapability", () => null);
  wire.onRequest("client/unregisterCapability", () => null);
  wire.onRequest(
    "workspace/configuration",
    (params: { items: any[] }) => params.items.map(() => null)
  );

  // Capture published diagnostics.
  wire.onNotification(
    "textDocument/publishDiagnostics",
    (params) => {
      if (params?.uri === URI) {
        lastDiagnostics = params.diagnostics ?? [];
      }
    }
  );

  setStatus("Initializing LSP…");
  await wire.request("initialize", {
    processId: null,
    rootUri: "file:///raw-demo",
    capabilities: {},
    initializationOptions: { dialect: $dialect.value },
  });
  wire.notification("initialized", {});

  // Open the document.
  wire.notification("textDocument/didOpen", {
    textDocument: {
      uri: URI,
      languageId: "sql",
      version: docVersion,
      text: $doc.value,
    },
  });

  setStatus("Ready", "ready");

  // --- Wire up DOM events ---

  $doc.addEventListener("input", () => {
    updatePosition();
    void syncDoc();
  });
  for (const evt of ["click", "keyup", "select"]) {
    $doc.addEventListener(evt, updatePosition);
  }
  updatePosition();

  $dialect.addEventListener("change", () => {
    wire!.notification("workspace/didChangeConfiguration", {
      settings: { sql: { dialect: $dialect.value } },
    });
  });

  $suggest.addEventListener("click", async () => {
    const { line, character } = offsetToLineCol($doc.value, $doc.selectionStart);
    const params = {
      textDocument: { uri: URI },
      position: { line, character },
    };
    showRequest("textDocument/completion", params);
    try {
      const result = await wire!.request("textDocument/completion", params);
      const items = Array.isArray(result) ? result : result?.items ?? [];
      summarizeCompletions(items, { line, character });
      $response.textContent = JSON.stringify(items, null, 2);
    } catch (e: any) {
      $response.textContent = `Error: ${JSON.stringify(e, null, 2)}`;
    }
  });

  $diagnose.addEventListener("click", async () => {
    showRequest("(reading last published diagnostics)", { uri: URI });
    // Diagnostics are pushed on didChange; wait briefly to ensure the
    // debounced run has fired.
    await syncDoc();
    await new Promise((r) => setTimeout(r, 250));
    summarizeDiagnostics(lastDiagnostics ?? []);
    $response.textContent = JSON.stringify(lastDiagnostics ?? [], null, 2);
  });
}

function showRequest(method: string, params: any): void {
  $request.textContent = JSON.stringify({ method, params }, null, 2);
}

function summarizeCompletions(
  items: any[],
  position: { line: number; character: number }
): void {
  if (items.length === 0) {
    $responseSummary.innerHTML = `<strong>No suggestions</strong> at line ${position.line}, column ${position.character}.`;
    return;
  }
  const byKind: Record<string, string[]> = {};
  const KIND_NAME: Record<number, string> = {
    1: "Text", 2: "Method", 3: "Function", 4: "Constructor", 5: "Field",
    6: "Variable", 7: "Class", 8: "Interface", 9: "Module", 10: "Property",
    11: "Unit", 12: "Value", 13: "Enum", 14: "Keyword", 15: "Snippet",
    16: "Color", 17: "File", 18: "Reference",
  };
  for (const item of items) {
    const k = KIND_NAME[item.kind] ?? `kind${item.kind}`;
    (byKind[k] ??= []).push(item.label);
  }
  const parts = Object.entries(byKind).map(
    ([k, labels]) => `<strong>${k}</strong> (${labels.length}): ${labels.slice(0, 12).map(escapeHtml).join(", ")}${labels.length > 12 ? "…" : ""}`
  );
  $responseSummary.innerHTML = `<strong>${items.length}</strong> suggestion${items.length === 1 ? "" : "s"}:<br>` + parts.join("<br>");
}

function summarizeDiagnostics(diags: any[]): void {
  if (diags.length === 0) {
    $responseSummary.innerHTML = `<strong>No diagnostics</strong>.`;
    return;
  }
  const SEV: Record<number, string> = { 1: "Error", 2: "Warning", 3: "Info", 4: "Hint" };
  const parts = diags.map(
    (d) => `<strong>${SEV[d.severity] ?? "?"}</strong> at line ${d.range.start.line}: ${escapeHtml(d.message)}`
  );
  $responseSummary.innerHTML = parts.join("<br>");
}

main().catch((err) => {
  console.error(err);
  setStatus(`Error: ${err?.message ?? err}`, "error");
});
