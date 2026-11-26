import { EventEmitter } from "events";
import net from "net";
import {
  CliError,
  ConnectionsParams,
  CliResponse,
  CliResultResponse,
  EntitiesParams,
  SchemasParams,
  QueryParams,
  StructureParams,
  CreateTabParams,
  CreateTabResult,
  SwitchTabParams,
  SavedQueriesParams,
  SavedQueryParams,
  SavedQueryResult,
  CreateSavedQueryParams,
  UpdateSavedQueryParams,
  RequestApprovalParams,
  RequestApprovalResult,
} from "./protocol";
import { ConnectionsReply } from "./replies/ConnectionsReply";
import { EntitiesReply } from "./replies/EntitiesReply";
import { SchemasReply } from "./replies/SchemasReply";
import { QueryReply } from "./replies/QueryReply";
import { StructureReply } from "./replies/StructureReply";
import { CliReply } from "./replies/CliReply";
import { SavedQueriesReply } from "./replies/SavedQueriesReply";
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

  async getConnections(params: ConnectionsParams = {}): Promise<ConnectionsReply> {
    const response = await this.request("getConnections", params);
    return new ConnectionsReply(response);
  }

  async getSchemas(params: SchemasParams): Promise<SchemasReply> {
    const response = await this.request("getSchemas", params);
    return new SchemasReply(response);
  }

  async getEntities(params: EntitiesParams): Promise<EntitiesReply> {
    const response = await this.request("getEntities", params);
    return new EntitiesReply(response);
  }

  async getTableStructure(params: StructureParams): Promise<StructureReply> {
    const response = await this.request("getTableStructure", params);
    return new StructureReply(response);
  }

  async runQuery(params: QueryParams): Promise<QueryReply> {
    const response = await this.request("runQuery", params);
    return new QueryReply(response);
  }

  async openTab(params: CreateTabParams): Promise<CliReply<CreateTabResult>> {
    const response = await this.request("openTab", params);
    return new CliReply(response);
  }

  async switchTab(params: SwitchTabParams): Promise<void> {
    await this.request("switchTab", params);
  }

  async requestApproval(
    params: RequestApprovalParams,
  ): Promise<CliReply<RequestApprovalResult>> {
    const response = await this.request("requestApproval", params);
    return new CliReply(response);
  }

  async getSavedQueries(params: SavedQueriesParams): Promise<SavedQueriesReply> {
    const response = await this.request("getSavedQueries", params);
    return new SavedQueriesReply(response);
  }

  async getSavedQuery(
    params: SavedQueryParams,
  ): Promise<CliReply<SavedQueryResult>> {
    const response = await this.request("getSavedQuery", params);
    return new CliReply(response);
  }

  async createSavedQuery(
    params: CreateSavedQueryParams,
  ): Promise<CliReply<SavedQueryResult>> {
    const response = await this.request("createSavedQuery", params);
    return new CliReply(response);
  }

  async updateSavedQuery(
    params: UpdateSavedQueryParams,
  ): Promise<CliReply<SavedQueryResult>> {
    const response = await this.request("updateSavedQuery", params);
    return new CliReply(response);
  }

  /** Sends one request and resolves with the app's reply, or throws the CliError it replied with. */
  private async request(
    method: unknown,
    params: unknown,
  ): Promise<CliResultResponse> {
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
        socket.write(JSON.stringify({ method, params, client }) + "\n");
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

    let response: CliResponse;
    try {
      response = JSON.parse(raw);
    } catch {
      throw new CliError(
        "INTERNAL",
        "Beekeeper Studio sent a reply that is not valid JSON.",
      );
    }
    if (!response || typeof response !== "object" || !("ok" in response)) {
      throw new CliError(
        "INTERNAL",
        "Beekeeper Studio sent an unexpected reply.",
      );
    }
    if (response.ok === false) {
      const error = response.error;
      throw new CliError(error.code, error.message, {
        hint: error.hint,
        details: error.details,
      });
    }
    return response;
  }
}
