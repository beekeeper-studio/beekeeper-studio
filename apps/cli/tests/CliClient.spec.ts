import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { Client } from "../src/Client";
import { OpenConnection } from "../src/protocol";

let server: net.Server | null = null;
let dir: string | null = null;

async function fakeApp(result: unknown): Promise<string> {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-cli-"));
  const socketPath = path.join(dir, "cli.sock");
  server = net.createServer((socket) => {
    socket.once("data", (chunk) => {
      const request = JSON.parse(chunk.toString());
      const reply = { id: request.id, type: "reply", data: result };
      socket.end(JSON.stringify(reply) + "\n");
    });
  });
  await new Promise<void>((resolve) => server!.listen(socketPath, resolve));
  return socketPath;
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
    const socketPath = await fakeApp({ connections: [] });
    const client = new Client({ socketPath });
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
    const socketPath = await fakeApp({ connections: [open] });
    const client = new Client({ socketPath });
    expect((await client.getConnections()).connections).toEqual([open]);
  });
});

describe("Client timeout", () => {
  it("hangs up so the app can stop waiting too", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-cli-"));
    const socketPath = path.join(dir, "cli.sock");
    let hungUp: () => void = () => undefined;
    const closed = new Promise<void>((resolve) => {
      hungUp = resolve;
    });
    server = net.createServer((socket) => {
      socket.resume();
      socket.on("close", hungUp);
    });
    await new Promise<void>((resolve) => server!.listen(socketPath, resolve));

    const client = new Client({ socketPath, timeout: 50 });
    client.on("error", () => undefined);
    await expect(client.getConnections()).rejects.toThrow(
      "No reply from Beekeeper Studio after 50ms.",
    );
    await closed;
  });
});
