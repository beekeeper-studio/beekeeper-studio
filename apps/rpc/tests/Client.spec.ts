import { describe, it, expect, afterEach } from "vitest";
import { EventEmitter } from "events";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { Client } from "../src/Client";
import { RpcServer } from "../src/RpcServer";
import { CancelError, Message, OpenConnection } from "../src/protocol";

/**
 * A port over the test's socket server, so RpcServer can answer Client.
 * Each connection carries one message; a response goes back on the socket
 * its request came in on.
 */
class SocketServerPort extends EventEmitter {
  private readonly sockets = new Map<string, net.Socket>();

  accept(socket: net.Socket): void {
    socket.once("data", this.handleData.bind(this, socket));
  }

  postMessage(message: unknown): void {
    const response = message as Extract<Message, { type: "response" }>;
    const socket = this.sockets.get(response.input.id);
    this.sockets.delete(response.input.id);
    socket?.end(JSON.stringify(response) + "\n");
  }

  private handleData(socket: net.Socket, chunk: Buffer): void {
    const message: Message = JSON.parse(chunk.toString());
    if (message.type === "request") {
      this.sockets.set(message.input.id, socket);
    } else {
      socket.end();
    }
    this.emit("message", { data: message });
  }
}

let server: net.Server | null = null;
let dir: string | null = null;

async function startApp(): Promise<{ socketPath: string; app: RpcServer }> {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-rpc-"));
  const socketPath = path.join(dir, "rpc.sock");
  const port = new SocketServerPort();
  const app = new RpcServer(port);
  app.initialize();
  server = net.createServer(port.accept.bind(port));
  await new Promise<void>((resolve) => server!.listen(socketPath, resolve));
  return { socketPath, app };
}

afterEach(async () => {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  if (dir) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  server = null;
  dir = null;
});

describe("Client communication", () => {
  it("returns no connections when none are open", async () => {
    const started = await startApp();
    started.app.register("getConnections", () => ({ connections: [] }));
    const client = new Client({ socketPath: started.socketPath });
    expect((await client.getConnections()).connections).toEqual([]);
  });

  it("returns the open connections", async () => {
    const open: OpenConnection = {
      id: "sid-1",
      name: "Local Dev",
      connectionType: "sqlite",
      readOnlyMode: false,
      approved: true,
    };
    const started = await startApp();
    started.app.register("getConnections", () => ({ connections: [open] }));
    const client = new Client({ socketPath: started.socketPath });
    expect((await client.getConnections()).connections).toEqual([open]);
  });
});

describe("Client cancel", () => {
  it("rejects with CancelError once the app cancels the request", async () => {
    const started = await startApp();
    const running = Promise.withResolvers<void>();
    started.app.register("getConnections", () => {
      running.resolve();
      return new Promise(() => {});
    });

    const client = new Client({ socketPath: started.socketPath });
    const controller = new AbortController();
    const request = client.getConnections({ signal: controller.signal });
    await running.promise;
    controller.abort();

    await expect(request).rejects.toBeInstanceOf(CancelError);
  });
});
