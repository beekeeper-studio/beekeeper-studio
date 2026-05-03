import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createMessageConnection,
  MessageConnection,
} from "vscode-jsonrpc/browser";
import { SchemaProvider } from "../server/schema/SchemaProvider";
import {
  GetColumnsMethod,
  GetColumnsParams,
  GetColumnsResult,
  GetDefaultSchemaMethod,
  GetDefaultSchemaResult,
  GetSchemasMethod,
  GetSchemasResult,
  GetTablesMethod,
  GetTablesParams,
  GetTablesResult,
  InvalidateSchemaMethod,
  InvalidateSchemaParams,
} from "../server/schema/messages";

/**
 * Host-side wiring that answers the worker's `bks/schema/*` requests by
 * delegating to a `SchemaProvider` implementation. The host owns the actual
 * data source (Beekeeper IPC, REST API, in-memory stub, ...); this bridge
 * keeps the worker pure.
 *
 * # Connection ownership
 *
 * There must be **exactly one** `MessageConnection` per direction between
 * host and worker. JSON-RPC requires one response per request id; if two
 * connections both listen on the same channel, both will respond to every
 * request — one with the real result, one with "method not found" — and
 * the requestor sees whichever arrives first.
 *
 * The bridge owns the host-side connection and exposes it via
 * `bridge.connection`. Wire your LSP client to **the same connection**, or
 * have it share the underlying Worker only if it accepts an existing
 * `MessageConnection`.
 *
 * Use `HostSchemaBridge.fromWorker(worker, provider)` when the bridge
 * should manage the connection itself, or
 * `HostSchemaBridge.fromConnection(connection, provider)` when the caller
 * has already built one.
 */
export class HostSchemaBridge {
  private disposers: { dispose(): void }[] = [];

  private constructor(
    public readonly connection: MessageConnection,
    private provider: SchemaProvider,
    private ownsListen: boolean
  ) {
    this.registerHandlers();
  }

  /**
   * Wraps a Worker. The bridge creates the MessageConnection and starts
   * listening on it. The bridge will dispose the connection on `dispose()`.
   */
  static fromWorker(
    worker: Worker,
    provider: SchemaProvider
  ): HostSchemaBridge {
    const reader = new BrowserMessageReader(worker as any);
    const writer = new BrowserMessageWriter(worker as any);
    const connection = createMessageConnection(reader, writer);
    const bridge = new HostSchemaBridge(connection, provider, true);
    connection.listen();
    return bridge;
  }

  /**
   * Attaches schema handlers to a pre-existing MessageConnection. Bridge
   * does NOT call `connection.listen()` — caller manages that.
   */
  static fromConnection(
    connection: MessageConnection,
    provider: SchemaProvider
  ): HostSchemaBridge {
    return new HostSchemaBridge(connection, provider, false);
  }

  /** Tell the worker its cached schema is stale. Pass no args to clear all. */
  invalidate(params: InvalidateSchemaParams = {}): void {
    this.connection.sendNotification(InvalidateSchemaMethod, params);
  }

  /** Swap in a new SchemaProvider implementation (e.g. on connection change). */
  setProvider(provider: SchemaProvider): void {
    this.provider = provider;
    this.invalidate();
  }

  dispose(): void {
    for (const d of this.disposers) d.dispose();
    if (this.ownsListen) this.connection.dispose();
  }

  private registerHandlers(): void {
    this.disposers.push(
      this.connection.onRequest(
        GetSchemasMethod,
        async (): Promise<GetSchemasResult> => {
          const schemas = await this.provider.getSchemas();
          return { schemas };
        }
      )
    );
    this.disposers.push(
      this.connection.onRequest(
        GetTablesMethod,
        async (params: GetTablesParams | null): Promise<GetTablesResult> => {
          const tables = await this.provider.getTables(params?.schema);
          return { tables };
        }
      )
    );
    this.disposers.push(
      this.connection.onRequest(
        GetColumnsMethod,
        async (params: GetColumnsParams): Promise<GetColumnsResult> => {
          const columns = await this.provider.getColumns(
            params.table,
            params.schema
          );
          return { columns };
        }
      )
    );
    this.disposers.push(
      this.connection.onRequest(
        GetDefaultSchemaMethod,
        async (): Promise<GetDefaultSchemaResult> => {
          const schema = this.provider.getDefaultSchema
            ? await this.provider.getDefaultSchema()
            : undefined;
          return { schema };
        }
      )
    );
  }
}
