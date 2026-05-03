import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, keymap, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { sql, SQLite } from "@codemirror/lang-sql";
import {
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { LSPClient, languageServerSupport } from "@codemirror/lsp-client";

import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

import { SqliteSchemaProvider } from "../_shared/SqliteSchemaProvider";
import { SAMPLE_SCHEMA_SQL } from "../_shared/sampleSchema";
import { WorkerTransport } from "../_shared/WorkerTransport";

const status = document.getElementById("status")!;
const schemaDisplay = document.getElementById("schema-display")!;
const editorEl = document.getElementById("editor")!;

const setStatus = (msg: string, kind: "loading" | "ready" | "error" = "loading") => {
  status.textContent = msg;
  status.className = kind === "loading" ? "" : kind;
};

async function main(): Promise<void> {
  setStatus("Loading sql.js (WASM)…");
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });

  const db = new SQL.Database();
  db.exec(SAMPLE_SCHEMA_SQL);
  const provider = new SqliteSchemaProvider(db);

  // Render the schema for the side panel so the demo reader knows what's
  // available without opening the dev tools.
  const tables = await provider.getTables();
  const lines: string[] = [];
  for (const t of tables) {
    const cols = await provider.getColumns(t.name);
    lines.push(`${t.name}`);
    for (const c of cols) {
      lines.push(`  ${c.name}: ${c.dataType ?? "?"}${c.primaryKey ? "  (pk)" : ""}`);
    }
    lines.push("");
  }
  schemaDisplay.textContent = lines.join("\n");

  setStatus("Spawning worker…");
  const worker = new Worker(
    new URL("../../dist/worker.js", import.meta.url),
    { type: "module" }
  );

  const transport = new WorkerTransport(worker, provider);

  setStatus("Connecting to language server…");
  const client = new LSPClient({ rootUri: "file:///demo" }).connect(transport);

  // Tell the server which dialect to use, once connected.
  client.initializing
    .then(() => {
      client.notification("workspace/didChangeConfiguration", {
        settings: { sql: { dialect: "sqlite" } },
      });
      setStatus("Ready · type below", "ready");
    })
    .catch((err) => {
      console.error("LSP init failed", err);
      setStatus(`LSP init failed: ${err?.message ?? err}`, "error");
    });

  const initialDoc =
    "-- Try: type 'SELECT u.' below for column completion\n" +
    "-- Try: 'SELECT bogus FROM users' for a diagnostic\n" +
    "\n" +
    "SELECT u.name, o.total\n" +
    "FROM users u\n" +
    "JOIN orders o ON u.id = o.user_id\n" +
    "WHERE o.status = 'shipped';\n";

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      syntaxHighlighting(defaultHighlightStyle),
      sql({ dialect: SQLite }),
      autocompletion({ activateOnTyping: true }),
      languageServerSupport(client, "file:///demo/query.sql", "sql"),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
    ],
  });

  new EditorView({ state, parent: editorEl });
}

main().catch((err) => {
  console.error(err);
  setStatus(`Error: ${err.message ?? err}`, "error");
});
