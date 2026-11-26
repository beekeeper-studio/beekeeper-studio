import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import net from "net";
import {
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
export const DEFAULT_CLI_TIMEOUT = 30000;

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

export interface CliClientOptions {
  /** Defaults to the installed app's socket. */
  socketPath?: string;
  /** Milliseconds to wait for a reply. 0 disables the timeout. */
  timeout?: number;
  /** Shown to the user when the app asks them to approve this client. */
  clientName?: string;
}

/**
 * Emits "error" for requests that get no reply: the app is not running, a
 * timeout, a dropped connection. Giving up closes the socket, which tells the
 * app to stop waiting too, e.g. to close an approval dialog.
 */
export class Client extends EventEmitter<{ error: [unknown] }> {
  private readonly socketPath: string;
  private readonly timeout: number;

  constructor(public readonly options: CliClientOptions = {}) {
    super();
    this.socketPath = options.socketPath ?? defaultCliSocketPath();
    this.timeout = options.timeout ?? DEFAULT_CLI_TIMEOUT;
  }

  async getConnections(): Promise<ConnectionsResult> {
    return (await this.request("getConnections", {})) as ConnectionsResult;
  }

  async getSchemas(params: SchemasParams): Promise<SchemasResult> {
    return (await this.request("getSchemas", params)) as SchemasResult;
  }

  async getEntities(params: EntitiesParams): Promise<EntitiesResult> {
    return (await this.request("getEntities", params)) as EntitiesResult;
  }

  async getTableStructure(params: StructureParams): Promise<StructureResult> {
    return (await this.request("getTableStructure", params)) as StructureResult;
  }

  async runQuery(params: QueryParams): Promise<QueryResult> {
    return (await this.request("runQuery", params)) as QueryResult;
  }

  async openTab(params: OpenTabParams): Promise<OpenTabResult> {
    return (await this.request("openTab", params)) as OpenTabResult;
  }

  async switchTab(params: SwitchTabParams): Promise<void> {
    await this.request("switchTab", params);
  }

  async requestApproval(
    params: RequestApprovalParams,
  ): Promise<RequestApprovalResult> {
    return (await this.request(
      "requestApproval",
      params,
    )) as RequestApprovalResult;
  }

  async getSavedQueries(
    params: SavedQueriesParams,
  ): Promise<SavedQueriesResult> {
    return (await this.request(
      "getSavedQueries",
      params,
    )) as SavedQueriesResult;
  }

  async getSavedQuery(params: SavedQueryParams): Promise<SavedQueryResult> {
    return (await this.request("getSavedQuery", params)) as SavedQueryResult;
  }

  async createSavedQuery(
    params: CreateSavedQueryParams,
  ): Promise<SavedQueryResult> {
    return (await this.request("createSavedQuery", params)) as SavedQueryResult;
  }

  async updateSavedQuery(params: UpdateSavedQueryParams): Promise<void> {
    await this.request("updateSavedQuery", params);
  }

  /** Sends one request and resolves with the reply's data, or throws the CliError it replied with. */
  private async request(method: unknown, params: unknown): Promise<unknown> {
    const id = randomUUID();
    const reply = new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      socket.setEncoding("utf8");

      let buffer = "";
      let timer: NodeJS.Timeout | null = null;

      const finish = (fn: () => void) => {
        if (timer) clearTimeout(timer);
        socket.destroy();
        fn();
      };

      if (this.timeout > 0) {
        timer = setTimeout(
          () =>
            finish(() =>
              reject(
                new CliError(
                  "INTERNAL",
                  `No reply from Beekeeper Studio after ${this.timeout}ms.`,
                ),
              ),
            ),
          this.timeout,
        );
      }

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
    if (response.type === "error") {
      throw new CliError(response.errorCode ?? "INTERNAL", response.error, {
        hint: response.errorHint,
        details: response.errorDetail,
      });
    }
    return response.data;
  }
}
