import { EventEmitter } from "events";
import net from "net";
import type {
  ClientInfo,
  ErrorCode,
  Message,
  Reply,
  Request,
} from "./protocol";

function ignoreError(): void {}

/** A CliError reply, so RpcClient rejects with a CliError like the app's own. */
function cliErrorReply(id: string, error: string): Reply {
  return {
    id,
    type: "error",
    error,
    errorName: "CliError",
    errorCode: "INTERNAL",
  };
}

/** One request over its own connection. Always ends in exactly one reply. */
class SocketExchange {
  private readonly socket: net.Socket;
  private buffer = "";
  private finished = false;

  constructor(
    private readonly port: SocketClientPort,
    socketPath: string,
    private readonly request: Request,
  ) {
    this.socket = net.createConnection(socketPath);
  }

  start(): void {
    this.socket.setEncoding("utf8");
    this.socket.on("connect", this.handleConnect.bind(this));
    this.socket.on("data", this.handleData.bind(this));
    this.socket.on("end", this.handleEnd.bind(this));
    this.socket.on("error", this.handleError.bind(this));
  }

  private handleConnect(): void {
    const message: Message = { type: "request", input: this.request };
    this.socket.write(JSON.stringify(message) + "\n");
  }

  private handleData(chunk: string): void {
    this.buffer += chunk;
    const newline = this.buffer.indexOf("\n");
    if (newline !== -1) {
      this.handleLine(this.buffer.slice(0, newline));
    }
  }

  private handleEnd(): void {
    if (this.buffer.trim()) {
      this.handleLine(this.buffer);
      return;
    }
    const error = "Beekeeper Studio closed the connection without replying.";
    this.finish(cliErrorReply(this.request.id, error));
  }

  private handleError(error: NodeJS.ErrnoException): void {
    // The socket's code (ENOENT, ECONNREFUSED, ...) tells "app not running" apart
    const errorCode = error.code as ErrorCode;
    const reply: Reply = {
      id: this.request.id,
      type: "error",
      error: error.message,
      errorName: error.name,
      errorCode,
    };
    this.finish(reply);
  }

  private handleLine(line: string): void {
    let message: Message;
    try {
      message = JSON.parse(line);
    } catch {
      const error = "Beekeeper Studio sent a reply that is not valid JSON.";
      this.finish(cliErrorReply(this.request.id, error));
      return;
    }
    if (
      message?.type !== "response" ||
      typeof message.input !== "object" ||
      message.input?.id !== this.request.id
    ) {
      const error = "Beekeeper Studio sent an unexpected reply.";
      this.finish(cliErrorReply(this.request.id, error));
      return;
    }
    this.finish(message.input);
  }

  private finish(reply: Reply): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.socket.destroy();
    this.port.receive(reply);
  }
}

/** A port adapter that lets RpcClient send requests over a local socket. */
export class SocketClientPort extends EventEmitter {
  constructor(
    private readonly socketPath: string,
    private readonly client?: ClientInfo,
  ) {
    super();
  }

  postMessage(message: unknown): void {
    const outgoing = message as Message;
    if (outgoing.type === "notification") {
      const socket = net.createConnection(this.socketPath);
      // A lost notification has nobody to report to
      socket.on("error", ignoreError);
      socket.end(JSON.stringify(outgoing) + "\n");
      return;
    }
    if (outgoing.type === "request") {
      const request: Request = { ...outgoing.input, client: this.client };
      const exchange = new SocketExchange(this, this.socketPath, request);
      exchange.start();
    }
  }

  /** Hands a reply to RpcClient, as if it came in over a port. */
  receive(reply: Reply): void {
    const message: Message = { type: "response", input: reply };
    this.emit("message", { data: message });
  }
}
