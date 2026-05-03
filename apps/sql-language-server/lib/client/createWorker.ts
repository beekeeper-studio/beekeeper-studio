import { SchemaProvider } from "../server/schema/SchemaProvider";
import { Dialect } from "../server/parsing/dialects";
import { HostSchemaBridge } from "./HostSchemaBridge";

export interface CreateSqlLanguageServerOptions {
  /**
   * The Worker hosting the language server. Caller is responsible for
   * instantiating it (typically via
   * `new Worker(new URL('@beekeeperstudio/sql-language-server/worker', import.meta.url), { type: 'module' })`).
   * We don't import the worker URL here because the worker needs to be
   * built separately and bundlers handle URL resolution differently.
   */
  worker: Worker;
  /**
   * The host's implementation of SchemaProvider. The bridge calls this in
   * response to requests from the worker.
   */
  schemaProvider: SchemaProvider;
  /** SQL dialect for parsing and diagnostics. Default: "ansi". */
  dialect?: Dialect;
}

export interface SqlLanguageServerHandle {
  /** The worker the server is running in. Pass to your LSP client as the transport. */
  worker: Worker;
  /** The bridge that answers schema requests. Hold a reference to call `invalidate()`. */
  bridge: HostSchemaBridge;
  /** Convenience: tear everything down. */
  dispose(): void;
}

/**
 * Set up the host-side bridge between a SQL language server worker and a
 * host-supplied SchemaProvider. **Does not** instantiate the LSP client —
 * that's the caller's job (and varies between @codemirror/lsp-client,
 * @marimo-team/codemirror-languageserver, etc.).
 *
 * The returned `bridge.connection` is the single shared MessageConnection
 * for this worker. Wire your LSP client to it (most clients accept a
 * pre-built MessageConnection). Do NOT create a separate connection on
 * the same Worker — JSON-RPC dispatch will conflict.
 */
export function createSqlLanguageServer(
  opts: CreateSqlLanguageServerOptions
): SqlLanguageServerHandle {
  const bridge = HostSchemaBridge.fromWorker(opts.worker, opts.schemaProvider);
  return {
    worker: opts.worker,
    bridge,
    dispose() {
      bridge.dispose();
      opts.worker.terminate();
    },
  };
}
