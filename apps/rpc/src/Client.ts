import { EventEmitter } from "events";
import {
  ConnectionsResult,
  CreateSavedQueryParams,
  EntitiesParams,
  EntitiesResult,
  Methods,
  OpenTabParams,
  OpenTabResult,
  QueryParams,
  QueryResult,
  RequestApprovalParams,
  RequestApprovalResult,
  RequestOptions,
  SavedQueriesParams,
  SavedQueriesResult,
  SavedQueryParams,
  SavedQueryResult,
  SchemasParams,
  SchemasResult,
  StructureParams,
  StructureResult,
  SwitchTabParams,
  UpdateSavedQueryParams,
} from "./protocol";
import { RpcClient } from "./RpcClient";
import { SocketClientPort } from "./SocketClientPort";
import { defaultCliSocketPath } from "./socketPath";

export const CLI_EXIT_OK = 0;
export const CLI_EXIT_ERROR = 1;
export const CLI_EXIT_USAGE = 2;

const CONNECT_ERROR_CODES = new Set([
  "ENOENT",
  "ECONNREFUSED",
  "EACCES",
  "ENOTSOCK",
  "EPIPE",
  "ECONNRESET",
]);

/** Whether the socket could not be reached, i.e. the app is not running or not listening there. */
export function isConnectError(error: any): boolean {
  return !!error && CONNECT_ERROR_CODES.has(error.code);
}

export interface ClientOptions {
  /** Defaults to the installed app's socket. */
  socketPath?: string;
  /** Shown to the user when the app asks them to approve this client. */
  clientName?: string;
}

/**
 * The app's CLI methods over its socket. Emits "error" when the socket
 * cannot be reached, i.e. the app is not running.
 */
export class Client extends EventEmitter<{ error: [unknown] }> {
  private readonly rpc: RpcClient<Methods>;

  constructor(public readonly options: ClientOptions = {}) {
    super();
    const socketPath = options.socketPath ?? defaultCliSocketPath();
    const client = options.clientName
      ? { name: options.clientName }
      : undefined;
    const port = new SocketClientPort(socketPath, client);
    this.rpc = new RpcClient<Methods>(port);
  }

  getConnections(options: RequestOptions = {}): Promise<ConnectionsResult> {
    return this.request("getConnections", {}, options);
  }

  getSchemas(
    params: SchemasParams,
    options: RequestOptions = {},
  ): Promise<SchemasResult> {
    return this.request("getSchemas", params, options);
  }

  getEntities(
    params: EntitiesParams,
    options: RequestOptions = {},
  ): Promise<EntitiesResult> {
    return this.request("getEntities", params, options);
  }

  getTableStructure(
    params: StructureParams,
    options: RequestOptions = {},
  ): Promise<StructureResult> {
    return this.request("getTableStructure", params, options);
  }

  runQuery(
    params: QueryParams,
    options: RequestOptions = {},
  ): Promise<QueryResult> {
    return this.request("runQuery", params, options);
  }

  openTab(
    params: OpenTabParams,
    options: RequestOptions = {},
  ): Promise<OpenTabResult> {
    return this.request("openTab", params, options);
  }

  switchTab(
    params: SwitchTabParams,
    options: RequestOptions = {},
  ): Promise<void> {
    return this.request("switchTab", params, options);
  }

  requestApproval(
    params: RequestApprovalParams,
    options: RequestOptions = {},
  ): Promise<RequestApprovalResult> {
    return this.request("requestApproval", params, options);
  }

  getSavedQueries(
    params: SavedQueriesParams,
    options: RequestOptions = {},
  ): Promise<SavedQueriesResult> {
    return this.request("getSavedQueries", params, options);
  }

  getSavedQuery(
    params: SavedQueryParams,
    options: RequestOptions = {},
  ): Promise<SavedQueryResult> {
    return this.request("getSavedQuery", params, options);
  }

  createSavedQuery(
    params: CreateSavedQueryParams,
    options: RequestOptions = {},
  ): Promise<SavedQueryResult> {
    return this.request("createSavedQuery", params, options);
  }

  updateSavedQuery(
    params: UpdateSavedQueryParams,
    options: RequestOptions = {},
  ): Promise<void> {
    return this.request("updateSavedQuery", params, options);
  }

  /**
   * Tells the app to stop the request. Only a notification: the request
   * rejects with CancelError once the app replies.
   */
  cancel(id: string): void {
    this.rpc.cancel(id);
  }

  private async request<K extends keyof Methods & string>(
    name: K,
    params: Parameters<Methods[K]>[0],
    options: RequestOptions,
  ): Promise<ReturnType<Methods[K]>> {
    try {
      return await this.rpc.request(name, params, options);
    } catch (error) {
      // Emitted here, not in the socket callbacks, so a listener that throws
      // rejects this request instead of crashing the process.
      if (isConnectError(error)) {
        this.emit("error", error);
      }
      throw error;
    }
  }
}
