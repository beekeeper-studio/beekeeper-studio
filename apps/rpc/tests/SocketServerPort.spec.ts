import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import {
  RequestHandledEvent,
  SocketServerPort,
  SocketServerPortError,
  SocketServerPortOptions,
} from "../src/SocketServerPort";
import { RpcServer } from "../src/RpcServer";
import { CliError } from "../src/protocol";
import type { CallContext } from "../src/protocol";

const quiet = { info() {}, warn() {}, error() {} };

const unix = process.platform !== "win32";

let dir: string;
let socketPath: string;
let adapters: SocketServerPort[];

interface App {
  adapter: SocketServerPort;
  server: RpcServer;
}

function createApp(options: Partial<SocketServerPortOptions> = {}): App {
  const port = new SocketServerPort({ socketPath, logger: quiet, ...options });
  adapters.push(port);
  const server = new RpcServer(port);
  server.initialize();
  return { adapter: port, server };
}

/** Writes raw text, optionally half-closes, and resolves with everything the server sent back. */
function sendRawString(text: string, { end = false } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let received = "";
    socket.setEncoding("utf8");
    socket.on("connect", () => {
      if (end) {
        socket.end(text);
      } else {
        socket.write(text);
      }
    });
    socket.on("data", (chunk: string) => {
      received += chunk;
    });
    socket.on("close", () => resolve(received));
    socket.on("error", reject);
  });
}

/** Sends one request message and returns the reply inside the response. */
async function send(request: object): Promise<object> {
  const message = { type: "request", input: request };
  const line = await sendRawString(JSON.stringify(message) + "\n");
  const response = JSON.parse(line);
  return response.input;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-cliserver-"));
  socketPath = unix
    ? path.join(dir, "cli.sock")
    : `\\\\.\\pipe\\bks-cliserver-${process.pid}-${Date.now()}`;
  adapters = [];
});

afterEach(async () => {
  for (const adapter of adapters) {
    await adapter.stop();
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("SocketServerPort", () => {
  it("answers each registered method and turns errors into error replies", async () => {
    const port = new SocketServerPort({ socketPath });
    const server = new RpcServer(port);
    server.initialize();
    server.register("method1", () => ({ big: BigInt("9007199254740993")}) );
    server.register("method2", () => {
      throw new CliError("NOT_FOUND", "nope", { hint: "look elsewhere" });
    });
    server.register("method3", () => {
      throw new Error("boom");
    });
    await port.start();

    await expect(
      sendRawString(
        '{"type":"request","input":{"id":"1","name":"method1","args":{}}}\n',
      ),
    ).resolves.toBe(
      '{"type":"response","input":' +
      '{"id":"1","type":"reply","data":{"big":"9007199254740993"}}}\n',
    );
    await expect(
      sendRawString('{"type":"request","input":{"name":"method2"}}\n'),
    ).resolves.toBe(
      '{"type":"response","input":' +
      '{"id":null,"type":"error","error":"nope","errorName":"CliError",' +
      '"errorCode":"NOT_FOUND","errorHint":"look elsewhere"}}\n',
    );
    await expect(
      sendRawString(
        '{"type":"request","input":{"name":"method3","args":{}}}\n',
      ),
    ).resolves.toBe(
      '{"type":"response","input":' +
      '{"id":null,"type":"error","error":"boom","errorName":"Error",' +
      '"errorCode":"INTERNAL"}}\n',
    );
  });

  it("rejects a method that is not registered", async () => {
    const server = createApp();
    server.server.register("method1", async () => ({}));
    await server.adapter.start();

    for (const method of ["missing", "toString", "__proto__"]) {
      await expect(send({ name: method, args: {} })).resolves.toEqual({
        id: null,
        type: "error",
        error: `Unknown method "${method}".`,
        errorName: "UnknownMethodError",
        errorCode: "USAGE",
      });
    }
  });

  it("answers a malformed line and reports it with no request", async () => {
    const server = createApp();
    const events: RequestHandledEvent[] = [];
    server.adapter.on("requestHandled", (event) => events.push(event));
    await server.adapter.start();

    await expect(sendRawString("not json\n")).resolves.toBe(
      JSON.stringify({
        type: "response",
        input: {
          id: null,
          type: "error",
          error: "Malformed CLI request: expected one JSON object per line.",
          errorCode: "USAGE",
        },
      }) + "\n",
    );
    expect(events).toHaveLength(1);
    expect(events[0].request).toBeNull();
  });

  it("answers a line that is not a request message", async () => {
    const server = createApp();
    server.server.register("method1", async () => ({}));
    await server.adapter.start();

    const line = JSON.stringify({ id: "1", name: "method1" }) + "\n";
    await expect(sendRawString(line)).resolves.toBe(
      JSON.stringify({
        type: "response",
        input: {
          id: null,
          type: "error",
          error: "Malformed CLI request: expected a request message.",
          errorCode: "USAGE",
        },
      }) + "\n",
    );
  });

  it("answers a client that half-closes without a trailing newline", async () => {
    const server = createApp();
    server.server.register("method1", async () => ({ pong: true }));
    await server.adapter.start();

    await expect(
      sendRawString(
        JSON.stringify({ type: "request", input: { name: "method1" } }),
        { end: true },
      ),
    ).resolves.toBe(
      JSON.stringify({
        type: "response",
        input: { id: null, type: "reply", data: { pong: true } },
      }) + "\n",
    );
  });

  it("rejects an oversized request before its line ends", async () => {
    const server = createApp({ maxRequestBytes: 64 });
    let called = false;
    server.server.register("method1", async () => {
      called = true;
      return {};
    });
    await server.adapter.start();

    await expect(
      send({ name: "method1", args: { sql: "x".repeat(200) } }),
    ).resolves.toEqual({
      id: null,
      type: "error",
      error: "Request is larger than 64 bytes.",
      errorCode: "USAGE",
    });
    expect(called).toBe(false);
  });

  it("keeps answering after an observer throws", async () => {
    const server = createApp();
    server.server.register("method1", async () => ({}));
    server.adapter.on("requestHandled", () => {
      throw new Error("audit log broke");
    });
    await server.adapter.start();

    await expect(send({ name: "method1" })).resolves.toEqual({
      id: null,
      type: "reply",
      data: {},
    });
    await expect(send({ name: "method1" })).resolves.toEqual({
      id: null,
      type: "reply",
      data: {},
    });
  });

  it("tells a running method when its caller hangs up", async () => {
    const server = createApp();
    const hungUp = new Promise<void>((resolve) => {
      server.server.register("method1", async (_params: unknown, context: CallContext) => {
        await new Promise((done) =>
          context.signal.addEventListener("abort", done),
        );
        resolve();
        return {};
      });
    });
    await server.adapter.start();

    const socket = net.createConnection(socketPath);
    socket.on("connect", () => {
      const message = { type: "request", input: { name: "method1" } };
      socket.write(JSON.stringify(message) + "\n");
      setTimeout(() => socket.destroy(), 20);
    });
    await hungUp;
  });

  it("cancels a running request on a $/cancel notification", async () => {
    const server = createApp();
    server.server.register("method1", () => new Promise(() => { }));
    await server.adapter.start();

    const reply = send({ id: "id-123", name: "method1" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const notification = {
      type: "notification",
      input: { name: "$/cancel", args: { id: "id-123" } },
    };
    await sendRawString(JSON.stringify(notification) + "\n");

    await expect(reply).resolves.toEqual({
      id: "id-123",
      type: "error",
      error: "The request was cancelled.",
      errorName: "CancelError",
    });
  });

  it("rejects a request whose id is already running", async () => {
    const app = createApp();
    app.server.register("method1", () => new Promise(() => {}));
    await app.adapter.start();

    send({ id: "id-123", name: "method1" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(send({ id: "id-123", name: "method1" })).resolves.toEqual({
      id: null,
      type: "error",
      error: "A request with id id-123 is already running.",
      errorCode: "USAGE",
    });
  });

  it("refuses to start without a socket path", async () => {
    const adapter = new SocketServerPort({ socketPath: "" });
    const error = await adapter.start().then(
      () => null,
      (e) => e,
    );
    expect(error).toBeInstanceOf(SocketServerPortError);
    expect(error.code).toBe(SocketServerPortError.SocketPathNotProvided);
  });

  it.runIf(unix)(
    "replaces a socket file left behind by a crashed instance",
    async () => {
      const stale = net.createServer();
      await new Promise<void>((resolve) => stale.listen(socketPath, resolve));
      // Closing without unlinking is what a crash leaves behind on disk.
      await new Promise<void>((resolve) => {
        stale.close(() => resolve());
      });
      if (!fs.existsSync(socketPath)) {
        fs.writeFileSync(socketPath, "");
      }

      const server = createApp();
      server.server.register("method1", async () => ({}));
      await server.adapter.start();
      await expect(send({ name: "method1" })).resolves.toEqual({
        id: null,
        type: "reply",
        data: {},
      });
    },
  );

  it.runIf(unix)(
    "leaves a live instance alone and fails to start",
    async () => {
      const first = createApp();
      first.server.register("method1", async () => ({ from: "first" }));
      await first.adapter.start();

      const second = createApp();
      const error = await second.adapter.start().then(
        () => null,
        (e) => e,
      );
      expect(error?.code).toBe("EADDRINUSE");
      await second.adapter.stop();
      await expect(send({ name: "method1" })).resolves.toEqual({
        id: null,
        type: "reply",
        data: { from: "first" },
      });
    },
  );

  it.runIf(unix)("only lets the owner connect", async () => {
    const server = createApp();
    await server.adapter.start();
    expect(fs.statSync(socketPath).mode & 0o777).toBe(0o600);
  });
});
