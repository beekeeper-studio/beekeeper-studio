import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import net from "net";
import {
  CancelError,
  CliError,
  ConnectionsResult,
  Reply,
  EntitiesParams,
  EntitiesResult,
  SchemasParams,
  SchemasResult,
  QueryParams,
  QueryResult,
  StructureParams,
  StructureResult,
  OpenTabParams,
  OpenTabResult,
  SwitchTabParams,
  SavedQueriesParams,
  SavedQueriesResult,
  SavedQueryParams,
  SavedQueryResult,
  CreateSavedQueryParams,
  UpdateSavedQueryParams,
  RequestApprovalParams,
  RequestApprovalResult,
} from "./protocol";
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

export interface RequestOptions {
  /** Id for this request, so it can be cancelled with cancel(). Generated when left out. */
  id?: string;
  signal?: AbortSignal;
}

export interface ClientOptions {
  /** Defaults to the installed app's socket. */
  socketPath?: string;
  /** Shown to the user when the app asks them to approve this client. */
  clientName?: string;
}

/**
 * Emits "error" for requests that get no reply: the app is not running or the
 * connection dropped.
 */
export class Client extends EventEmitter<{ error: [unknown] }> {
  private readonly socketPath: string;

  constructor(public readonly options: ClientOptions = {}) {
    super();
    this.socketPath = options.socketPath ?? defaultCliSocketPath();
  }

  async getConnections(
    options: RequestOptions = {},
  ): Promise<ConnectionsResult> {
    return (await this.request(
      "getConnections",
      {},
      options,
    )) as ConnectionsResult;
  }

  async getSchemas(
    params: SchemasParams,
    options: RequestOptions = {},
  ): Promise<SchemasResult> {
    return (await this.request("getSchemas", params, options)) as SchemasResult;
  }

  async getEntities(
    params: EntitiesParams,
    options: RequestOptions = {},
  ): Promise<EntitiesResult> {
    return (await this.request(
      "getEntities",
      params,
      options,
    )) as EntitiesResult;
  }

  async getTableStructure(
    params: StructureParams,
    options: RequestOptions = {},
  ): Promise<StructureResult> {
    return (await this.request(
      "getTableStructure",
      params,
      options,
    )) as StructureResult;
  }

  async runQuery(
    params: QueryParams,
    options: RequestOptions = {},
  ): Promise<QueryResult> {
    return (await this.request("runQuery", params, options)) as QueryResult;
  }

  async openTab(
    params: OpenTabParams,
    options: RequestOptions = {},
  ): Promise<OpenTabResult> {
    return (await this.request("openTab", params, options)) as OpenTabResult;
  }

  async switchTab(
    params: SwitchTabParams,
    options: RequestOptions = {},
  ): Promise<void> {
    await this.request("switchTab", params, options);
  }

  async requestApproval(
    params: RequestApprovalParams,
    options: RequestOptions = {},
  ): Promise<RequestApprovalResult> {
    return (await this.request(
      "requestApproval",
      params,
      options,
    )) as RequestApprovalResult;
  }

  async getSavedQueries(
    params: SavedQueriesParams,
    options: RequestOptions = {},
  ): Promise<SavedQueriesResult> {
    return (await this.request(
      "getSavedQueries",
      params,
      options,
    )) as SavedQueriesResult;
  }

  async getSavedQuery(
    params: SavedQueryParams,
    options: RequestOptions = {},
  ): Promise<SavedQueryResult> {
    return (await this.request(
      "getSavedQuery",
      params,
      options,
    )) as SavedQueryResult;
  }

  async createSavedQuery(
    params: CreateSavedQueryParams,
    options: RequestOptions = {},
  ): Promise<SavedQueryResult> {
    return (await this.request(
      "createSavedQuery",
      params,
      options,
    )) as SavedQueryResult;
  }

  async updateSavedQuery(
    params: UpdateSavedQueryParams,
    options: RequestOptions = {},
  ): Promise<void> {
    await this.request("updateSavedQuery", params, options);
  }

  /**
   * Tells the app to stop the request. Only a notification: the request
   * rejects with CancelError once the app replies.
   */
  cancel(id: string): void {
    const socket = net.createConnection(this.socketPath);
    // The request reports its own connection errors
    socket.on("error", () => { });
    const notification = { method: "$/cancel", params: { id } };
    socket.end(JSON.stringify(notification) + "\n");
  }

  /** Sends one request and resolves with the reply's data, or throws the CliError it replied with. */
  private async request(
    method: unknown,
    params: unknown,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const id = options.id ?? randomUUID();
    const onAbort = this.cancel.bind(this, id);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const reply = new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      socket.setEncoding("utf8");

      let buffer = "";
      const finish = (fn: () => void) => {
        options.signal?.removeEventListener("abort", onAbort);
        socket.destroy();
        fn();
      };

      socket.on("connect", () => {
        const client = this.options.clientName
          ? { name: this.options.clientName }
          : undefined;
        socket.write(JSON.stringify({ id, method, params, client }) + "\n");
      });
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        const newline = buffer.indexOf("\n");
        if (newline !== -1) {
          finish(() => resolve(buffer.slice(0, newline)));
        }
      });
      socket.on("end", () => {
        if (buffer.trim()) {
          finish(() => resolve(buffer));
        } else {
          finish(() =>
            reject(
              new CliError(
                "INTERNAL",
                "Beekeeper Studio closed the connection without replying.",
              ),
            ),
          );
        }
      });
      socket.on("error", (error) => finish(() => reject(error)));
    });
    let raw: string;
    try {
      raw = await reply;
    } catch (error) {
      // Emitted here, not in the socket callbacks, so a listener that throws
      // rejects this request instead of crashing the process.
      this.emit("error", error);
      throw error;
    }

    let response: Reply;
    try {
      response = JSON.parse(raw);
    } catch {
      throw new CliError(
        "INTERNAL",
        "Beekeeper Studio sent a reply that is not valid JSON.",
      );
    }
    if (
      !response ||
      typeof response !== "object" ||
      response.id !== id ||
      (response.type !== "reply" && response.type !== "error")
    ) {
      throw new CliError(
        "INTERNAL",
        "Beekeeper Studio sent an unexpected reply.",
      );
    }
    if (response.errorName === "CancelError") {
      throw new CancelError(id, response.error);
    }
    if (response.type === "error") {
      throw new CliError(response.errorCode ?? "INTERNAL", response.error, {
        hint: response.errorHint,
        details: response.errorDetail,
      });
    }
    return response.data;
  }
}
