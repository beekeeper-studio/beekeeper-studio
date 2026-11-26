import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { Client } from "../src/Client";
import { CancelError, OpenConnection } from "../src/protocol";

let server: net.Server | null = null;
let dir: string | null = null;

async function fakeApp(result: unknown): Promise<string> {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-cli-"));
  const socketPath = path.join(dir, "cli.sock");
  server = net.createServer((socket) => {
    socket.once("data", (chunk) => {
      const message = JSON.parse(chunk.toString());
      const reply = { id: message.input.id, type: "reply", data: result };
      const response = { type: "response", input: reply };
      socket.end(JSON.stringify(response) + "\n");
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

describe("Client cancel", () => {
  it("sends a cancel notification and rejects when the app replies", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-cli-"));
    const socketPath = path.join(dir, "cli.sock");
    const pending = new Map<string, net.Socket>();
    server = net.createServer((socket) => {
      socket.once("data", (chunk) => {
        const message = JSON.parse(chunk.toString());
        if (message.type === "request") {
          pending.set(message.input.id, socket);
          return;
        }
        expect(message).toEqual({
          type: "notification",
          input: { name: "$/cancel", args: { id: "id-123" } },
        });
        const reply = {
          id: message.input.args.id,
          type: "error",
          error: "The request was cancelled.",
          errorName: "CancelError",
        };
        const response = { type: "response", input: reply };
        pending
          .get(message.input.args.id)
          ?.end(JSON.stringify(response) + "\n");
        socket.end();
      });
    });
    await new Promise<void>((resolve) => server!.listen(socketPath, resolve));

    const client = new Client({ socketPath });
    const controller = new AbortController();
    const request = client.getConnections({
      id: "id-123",
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(pending.has("id-123")).toBe(true));
    controller.abort();

    await expect(request).rejects.toBeInstanceOf(CancelError);
  });
});
