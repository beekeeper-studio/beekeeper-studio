import { EventEmitter } from "events";
import fs from "fs";
import net from "net";
import { isWindowsPipePath } from "@beekeeperstudio/rpc";
import type { Message, Reply, Request } from "@beekeeperstudio/rpc";
import { CliRequestEvent } from "./auditLog";
import { serializeBigInt } from "@/services/plugin/utils";
import rawLog from "@bksLogger";

const log = rawLog.scope("SocketPortAdapter");

const DEFAULT_MAX_REQUEST_BYTES = 16 * 1024 * 1024;

export interface SocketPortAdapterOptions {
  socketPath: string;
  /** A request line longer than this is rejected. SQL text is the only sizeable input. */
  maxRequestBytes?: number;
}

export class SocketPortAdapterError extends Error {
  static readonly SocketPathNotProvided = "SOCKET_PATH_NOT_PROVIDED";

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SocketPortAdapterError";
  }
}

interface PendingRequest {
  socket: net.Socket;
  request: Request;
  /** The id the client sent, null for clients older than ids on the wire. */
  clientId: string | null;
  started: number;
  hangUp: () => void;
}

/** Resolves true when something is listening at the path, false when nothing answers. */
export function probeSocket(
  socketPath: string,
  timeoutMs = 1000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(socketPath);
    const done = (alive: boolean) => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
      resolve(alive);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

/**
 * A port over a local socket server, for RpcServer. Each connection carries
 * one newline-terminated message; the response goes back on the connection
 * its request came in on, which then closes. Emits "requestHandled" after
 * every reply, malformed requests included, to feed the audit log.
 */
export class SocketPortAdapter extends EventEmitter {
  private server: net.Server | null = null;
  private started = false;
  private readonly sockets = new Set<net.Socket>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly maxRequestBytes: number;

  constructor(private readonly options: SocketPortAdapterOptions) {
    super();
    this.maxRequestBytes = options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES;
    this.handleConnection = this.handleConnection.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  get socketPath(): string {
    return this.options.socketPath;
  }

  get listening(): boolean {
    return !!this.server?.listening;
  }

  /**
   * @throws {SocketPortAdapterError} without a socket path
   * @throws {Error} with code EADDRINUSE when another instance serves the socket
   */
  async start(): Promise<void> {
    if (this.started) {
      log.warn("Calling start when already started");
      return;
    }
    const socketPath = this.options.socketPath;
    if (!socketPath) {
      throw new SocketPortAdapterError(
        SocketPortAdapterError.SocketPathNotProvided,
        "No CLI socket path was provided.",
      );
    }

    if (!isWindowsPipePath(socketPath)) {
      await this.removeStaleSocketFile();
    }

    // allowHalfOpen: a client may send its request and close its writing side
    // before the reply is ready; the reply still has to go out.
    const server = net.createServer(
      { allowHalfOpen: true },
      this.handleConnection,
    );
    server.on("error", this.handleError);

    await this.listen(server);

    if (!isWindowsPipePath(socketPath)) {
      // Only the user who runs the app gets to talk to its database connections.
      try {
        fs.chmodSync(socketPath, 0o600);
      } catch (error) {
        log.warn(`Could not restrict permissions on ${socketPath}`, error);
      }
    }

    this.server = server;
    this.started = true;
    log.info(`CLI listening at ${socketPath}`);
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.started = false;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (!server) {
      return;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    this.removeSocketFile();
  }

  /** For process 'exit' handlers, where nothing asynchronous runs anymore. */
  stopSync(): void {
    const server = this.server;
    this.server = null;
    this.started = false;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    // An instance that never listened must not delete the socket another instance is serving.
    if (!server) {
      return;
    }
    try {
      server.close();
    } catch {
      // nothing to do, the process is going away
    }
    this.removeSocketFile();
  }

  /** Called by RpcServer with each response. */
  postMessage(message: unknown): void {
    const response = message as Extract<Message, { type: "response" }>;
    const pending = this.pending.get(response.input.id);
    if (!pending) {
      return;
    }
    this.pending.delete(response.input.id);
    pending.socket.off("end", pending.hangUp);
    pending.socket.off("close", pending.hangUp);

    const reply: Reply = { ...response.input, id: pending.clientId };
    if (reply.type === "error") {
      if (reply.errorName === "UnknownMethodError") {
        reply.errorCode = "USAGE";
      } else if (
        reply.errorName !== "CliError" &&
        reply.errorName !== "CancelError"
      ) {
        log.error("CLI request failed", reply.error);
        reply.errorCode = "INTERNAL";
      }
    }
    this.respond(pending.socket, reply, pending.request, pending.started);
  }

  private async listen(server: net.Server): Promise<void> {
    const socketPath = this.options.socketPath;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(socketPath, () => {
          server.off("error", reject);
          resolve();
        });
      });
    } catch (error) {
      if (error?.code === "EADDRINUSE") {
        log.warn(
          `Another Beekeeper Studio instance is serving the CLI at ${socketPath}`,
        );
      }
      throw error;
    }
  }

  private handleError(error: Error): void {
    log.error("CLI socket server error", error);
  }

  private async removeStaleSocketFile(): Promise<void> {
    const socketPath = this.options.socketPath;
    if (!fs.existsSync(socketPath)) {
      return;
    }
    // A file left behind by a crashed instance blocks listen() with EADDRINUSE,
    // but so does a live instance. Only remove it when nothing answers.
    if (await probeSocket(socketPath)) {
      return;
    }
    try {
      fs.unlinkSync(socketPath);
      log.info(`Removed stale CLI socket ${socketPath}`);
    } catch (error) {
      log.warn(`Could not remove stale CLI socket ${socketPath}`, error);
    }
  }

  private removeSocketFile(): void {
    const socketPath = this.options.socketPath;
    if (isWindowsPipePath(socketPath)) {
      return;
    }
    try {
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    } catch (error) {
      log.warn(`Could not remove CLI socket ${socketPath}`, error);
    }
  }

  private handleConnection(socket: net.Socket): void {
    this.sockets.add(socket);
    socket.on("close", () => this.sockets.delete(socket));
    socket.on("error", (error) =>
      log.warn("CLI client socket error", error?.message ?? error),
    );
    socket.setEncoding("utf8");

    let buffer = "";
    let handled = false;

    socket.on("data", (chunk: string) => {
      if (handled) {
        return;
      }
      buffer += chunk;
      if (buffer.length > this.maxRequestBytes) {
        handled = true;
        const error = `Request is larger than ${this.maxRequestBytes} bytes.`;
        this.respondUsageError(socket, error);
        return;
      }
      const newline = buffer.indexOf("\n");
      if (newline === -1) {
        return;
      }
      handled = true;
      this.handleLine(socket, buffer.slice(0, newline));
    });

    // A client that half-closes without a trailing newline still gets an answer.
    socket.on("end", () => {
      if (handled) {
        return;
      }
      handled = true;
      if (buffer.trim()) {
        this.handleLine(socket, buffer);
      } else {
        socket.end();
      }
    });
  }

  private handleLine(socket: net.Socket, line: string): void {
    let message: Message | null = null;
    try {
      message = JSON.parse(line);
    } catch {
      this.respondUsageError(
        socket,
        "Malformed CLI request: expected one JSON object per line.",
      );
      return;
    }

    if (message?.type === "notification") {
      socket.end();
      this.emit("message", { data: message });
      return;
    }

    if (message?.type !== "request") {
      this.respondUsageError(
        socket,
        "Malformed CLI request: expected a request message.",
      );
      return;
    }

    const clientId = message.input?.id ?? null;
    const id = clientId ?? crypto.randomUUID();
    if (this.pending.has(id)) {
      this.respondUsageError(
        socket,
        `A request with id ${id} is already running.`,
      );
      return;
    }

    const request: Request = { ...message.input, id };
    const hangUp = this.emitCancel.bind(this, id);
    // A client that half-closed to mark the end of its request is still listening.
    if (!socket.readableEnded) {
      socket.once("end", hangUp);
    }
    socket.once("close", hangUp);
    this.pending.set(id, {
      socket,
      request,
      clientId,
      started: Date.now(),
      hangUp,
    });
    this.emit("message", { data: { type: "request", input: request } });
  }

  /** A caller that hangs up no longer wants the answer, so the request is cancelled. */
  private emitCancel(id: string): void {
    const notification: Message = {
      type: "notification",
      input: { name: "$/cancel", args: { id } },
    };
    this.emit("message", { data: notification });
  }

  private respondUsageError(socket: net.Socket, error: string): void {
    const reply: Reply = {
      id: null,
      type: "error",
      error,
      errorCode: "USAGE",
    };
    this.respond(socket, reply, null, Date.now());
  }

  private respond(
    socket: net.Socket,
    reply: Reply,
    request: Request | null,
    started: number,
  ): void {
    let response = reply;
    let payload: string;
    try {
      const message: Message = { type: "response", input: response };
      payload = JSON.stringify(message, (_key, value) =>
        serializeBigInt(value),
      );
    } catch (error) {
      response = {
        id: reply.id,
        type: "error",
        error: `Could not serialize the response: ${error?.message ?? error}`,
        errorCode: "INTERNAL",
      };
      const message: Message = { type: "response", input: response };
      payload = JSON.stringify(message);
    }
    if (!socket.destroyed) {
      socket.end(payload + "\n");
    }
    const event: CliRequestEvent = {
      request,
      response,
      durationMs: Date.now() - started,
      responseBytes: Buffer.byteLength(payload),
    };
    try {
      this.emit("requestHandled", event);
    } catch (error) {
      log.warn("CLI request observer failed", error);
    }
  }
}
