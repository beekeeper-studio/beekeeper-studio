import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { RpcClient } from "../src/RpcClient";
import { SocketClientPort } from "../src/SocketClientPort";
import { CliError, Message } from "../src/protocol";

let server: net.Server | null = null;
let dir: string | null = null;

/** Starts a socket server that answers each line with `answer(message)`. */
async function startApp(
  answer: (message: Message, socket: net.Socket) => void,
): Promise<string> {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-rpc-port-"));
  const socketPath = path.join(dir, "rpc.sock");
  server = net.createServer((socket) => {
    socket.once("data", (chunk) => {
      answer(JSON.parse(chunk.toString()), socket);
    });
  });
  await new Promise<void>((resolve) => server!.listen(socketPath, resolve));
  return socketPath;
}

function respond(socket: net.Socket, input: unknown): void {
  socket.end(JSON.stringify({ type: "response", input }) + "\n");
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

describe("SocketClientPort", () => {
  it("sends the request with the client and resolves with the reply", async () => {
    const received: Message[] = [];
    const socketPath = await startApp((message, socket) => {
      received.push(message);
      const id = (message.input as { id: string }).id;
      respond(socket, { id, type: "reply", data: "pong" });
    });
    const port = new SocketClientPort(socketPath, { name: "Test Agent" });
    const client = new RpcClient(port);

    await expect(client.request("ping", { n: 1 })).resolves.toBe("pong");
    expect(received[0]).toMatchObject({
      type: "request",
      input: { name: "ping", args: { n: 1 }, client: { name: "Test Agent" } },
    });
  });

  it("sends a notification on its own connection", async () => {
    const received = Promise.withResolvers<Message>();
    const socketPath = await startApp((message, socket) => {
      received.resolve(message);
      socket.end();
    });
    const client = new RpcClient(new SocketClientPort(socketPath));

    client.cancel("id-123");
    await expect(received.promise).resolves.toEqual({
      type: "notification",
      input: { name: "$/cancel", args: { id: "id-123" } },
    });
  });

  it("rejects with the socket's code when the app is not running", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-rpc-port-"));
    const socketPath = path.join(dir, "missing.sock");
    const client = new RpcClient(new SocketClientPort(socketPath));

    await expect(client.request("ping")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects with a CliError when the app closes without replying", async () => {
    const socketPath = await startApp((_message, socket) => socket.end());
    const client = new RpcClient(new SocketClientPort(socketPath));

    const promise = client.request("ping");
    await expect(promise).rejects.toBeInstanceOf(CliError);
    await expect(promise).rejects.toThrow(
      "Beekeeper Studio closed the connection without replying.",
    );
  });

  it("rejects with a CliError when the reply is not for this request", async () => {
    const socketPath = await startApp((_message, socket) => {
      respond(socket, { id: "someone-else", type: "reply", data: "pong" });
    });
    const client = new RpcClient(new SocketClientPort(socketPath));

    await expect(client.request("ping")).rejects.toThrow(
      "Beekeeper Studio sent an unexpected reply.",
    );
  });

  it("rejects with a CliError when the reply is not JSON", async () => {
    const socketPath = await startApp((_message, socket) => {
      socket.end("not json\n");
    });
    const client = new RpcClient(new SocketClientPort(socketPath));

    await expect(client.request("ping")).rejects.toThrow(
      "Beekeeper Studio sent a reply that is not valid JSON.",
    );
  });
});
