import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Client, RpcServer, SocketServerPort, CliError } from "../src";

// Client is a dead simple wrapper of RpcClient. Most of it is already tested by rpc.spec.ts.
describe("Client communication", () => {
  let tmpDir: string;
  let port: SocketServerPort;
  let app: RpcServer;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-rpc-"));
    const socketPath = path.join(tmpDir, "rpc.sock");

    vi.stubEnv("BKS_CLI_SOCKET", socketPath);

    port = new SocketServerPort({
      socketPath,
      logger: {
        // shh... keep it quite
        info() { },
        warn() { },
        error() { },
      },
    });
    app = new RpcServer(port);

    app.initialize();
    await port.start();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await port.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("can send a request and get a response", async () => {
    const connections = [
      {
        id: "sid-1",
        name: "Local Dev",
        connectionType: "sqlite",
        readOnlyMode: false,
        approved: true,
      },
    ];
    app.register("getConnections", () => ({ connections }));
    await expect(new Client().getConnections()).resolves.toEqual({
      connections,
    });
  });

  it("rejects with the error the app threw", async () => {
    app.register("getConnections", () => {
      throw new CliError("NOT_APPROVED", "Not approved.");
    });
    await expect(new Client().getConnections()).rejects.toBeInstanceOf(
      CliError,
    );
  });
});
