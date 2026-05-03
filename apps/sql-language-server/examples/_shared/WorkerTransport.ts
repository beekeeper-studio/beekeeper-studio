import type { SchemaProvider } from "../../lib/server/schema/SchemaProvider";
import {
  GetColumnsMethod,
  GetDefaultSchemaMethod,
  GetSchemasMethod,
  GetTablesMethod,
} from "../../lib/server/schema/messages";

/**
 * A `@codemirror/lsp-client` `Transport` that bridges a Web Worker hosting
 * the SQL language server to the LSP client, AND answers the worker's
 * `bks/schema/*` requests by delegating to a host-supplied SchemaProvider.
 *
 * Messages flow:
 *
 *   editor → LSPClient → transport.send(jsonString) → worker.postMessage(obj)
 *   worker → host onmessage → if bks/*: answer locally
 *                          → else: stringify + dispatch to subscribers (LSP client)
 *
 * One Transport handles both LSP and schema messages on a single Worker —
 * which is the architecturally correct way to multiplex on one channel
 * (see HostSchemaBridge.ts for why two MessageConnections on one Worker is
 * broken).
 */
export class WorkerTransport {
  private handlers = new Set<(msg: string) => void>();

  constructor(
    private worker: Worker,
    private provider: SchemaProvider
  ) {
    worker.addEventListener("message", (event) => {
      const msg = event.data;
      if (msg && typeof msg === "object" && typeof msg.method === "string") {
        if (msg.method.startsWith("bks/")) {
          // Host-side request from the worker — answer locally; do NOT
          // forward to the LSP client.
          void this.handleSchemaRequest(msg);
          return;
        }
      }
      // LSP message — forward to subscribers as a JSON string.
      const str = typeof msg === "string" ? msg : JSON.stringify(msg);
      for (const h of this.handlers) h(str);
    });
  }

  send(message: string): void {
    this.worker.postMessage(JSON.parse(message));
  }

  subscribe(handler: (msg: string) => void): void {
    this.handlers.add(handler);
  }

  unsubscribe(handler: (msg: string) => void): void {
    this.handlers.delete(handler);
  }

  // ---

  private async handleSchemaRequest(msg: {
    id?: number | string;
    method: string;
    params?: any;
  }): Promise<void> {
    if (msg.id === undefined) return; // Notification — nothing to reply to.

    let result: unknown;
    try {
      switch (msg.method) {
        case GetSchemasMethod:
          result = { schemas: await this.provider.getSchemas() };
          break;
        case GetTablesMethod:
          result = {
            tables: await this.provider.getTables(msg.params?.schema),
          };
          break;
        case GetColumnsMethod:
          result = {
            columns: await this.provider.getColumns(
              msg.params?.table,
              msg.params?.schema
            ),
          };
          break;
        case GetDefaultSchemaMethod:
          result = {
            schema: this.provider.getDefaultSchema
              ? await this.provider.getDefaultSchema()
              : undefined,
          };
          break;
        default:
          this.worker.postMessage({
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32601, message: `Unknown method ${msg.method}` },
          });
          return;
      }
      this.worker.postMessage({ jsonrpc: "2.0", id: msg.id, result });
    } catch (err: any) {
      this.worker.postMessage({
        jsonrpc: "2.0",
        id: msg.id,
        error: {
          code: -32000,
          message: err?.message ?? String(err),
        },
      });
    }
  }
}
