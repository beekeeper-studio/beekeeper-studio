import { describe, it, expect, vi, beforeEach } from "vitest";

// Socket mode over an SSH tunnel: the socket lives on the far side, so
// connectTunnel must forward it with a `direct-streamlocal@openssh.com` channel
// (SSHConnection.forwardSocket) instead of a TCP port forward.

import type { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from "@/lib/db/types";

const { mockForward, mockForwardSocket } = vi.hoisted(() => ({
  mockForward: vi.fn().mockResolvedValue({}),
  mockForwardSocket: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/vendor/node-ssh-forward/index", () => ({
  SSHConnection: class {
    constructor(_opts: any) {}
    forward = mockForward;
    forwardSocket = mockForwardSocket;
  },
}));

vi.mock("portfinder", () => ({
  __esModule: true,
  default: { getPortPromise: vi.fn().mockResolvedValue(12345) },
  getPortPromise: vi.fn().mockResolvedValue(12345),
}));

vi.mock("@/common/platform_info", () => ({
  __esModule: true,
  default: { sshAuthSock: undefined },
}));

vi.mock("@bksLogger", () => ({
  __esModule: true,
  default: {
    scope: () => ({
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/handlers/utils", () => ({
  resolveHomePathToAbsolute: (p: string) => p,
}));

import connectTunnel from "@/lib/db/tunnel";

function buildSsh(overrides: Partial<IDbConnectionServerSSHConfig> = {}): IDbConnectionServerSSHConfig {
  return {
    host: "remote.example.com",
    port: 22,
    user: "admin",
    password: null,
    privateKey: null,
    passphrase: null,
    bastionHost: null,
    bastionPort: null,
    bastionUser: null,
    bastionPassword: null,
    bastionPrivateKey: null,
    bastionPassphrase: null,
    bastionMode: null,
    keepaliveInterval: 0,
    useAgent: false,
    ...overrides,
  };
}

function buildConfig(overrides: Partial<IDbConnectionServerConfig> = {}): IDbConnectionServerConfig {
  return {
    client: "postgresql" as any,
    host: "127.0.0.1",
    port: 5432,
    domain: null,
    socketPath: "/var/run/postgresql",
    socketPathEnabled: false,
    user: "user",
    osUser: "user",
    password: null,
    ssh: buildSsh(),
    sslCaFile: null,
    sslCertFile: null,
    sslKeyFile: null,
    sslRejectUnauthorized: false,
    ssl: false,
    readOnlyMode: false,
    ...overrides,
  } as IDbConnectionServerConfig;
}

describe("connectTunnel socket forwarding", () => {
  beforeEach(() => {
    mockForward.mockClear();
    mockForwardSocket.mockClear();
  });

  it("forwards the remote socket when socket mode is on", async () => {
    await connectTunnel(buildConfig({ socketPathEnabled: true }));

    expect(mockForwardSocket).toHaveBeenCalledTimes(1);
    expect(mockForwardSocket).toHaveBeenCalledWith({
      fromPort: 12345,
      socketPath: "/var/run/postgresql/.s.PGSQL.5432",
    });
    expect(mockForward).not.toHaveBeenCalled();
  });

  it("appends .s.PGSQL.<port> using the configured port", async () => {
    await connectTunnel(
      buildConfig({ socketPathEnabled: true, socketPath: "/tmp/pgsockets", port: 5433 })
    );

    expect(mockForwardSocket.mock.calls[0][0].socketPath).toBe("/tmp/pgsockets/.s.PGSQL.5433");
  });

  it("leaves a full socket file path alone", async () => {
    await connectTunnel(
      buildConfig({
        socketPathEnabled: true,
        socketPath: "/var/run/postgresql/.s.PGSQL.5433",
        port: 5432,
      })
    );

    expect(mockForwardSocket.mock.calls[0][0].socketPath).toBe(
      "/var/run/postgresql/.s.PGSQL.5433"
    );
  });

  it("does not append .s.PGSQL for non-postgres clients", async () => {
    await connectTunnel(
      buildConfig({
        client: "mysql" as any,
        socketPathEnabled: true,
        socketPath: "/var/run/mysqld/mysqld.sock",
        port: 3306,
      })
    );

    expect(mockForwardSocket.mock.calls[0][0].socketPath).toBe("/var/run/mysqld/mysqld.sock");
  });

  it("forwards a TCP port when socket mode is off", async () => {
    await connectTunnel(buildConfig({ host: "db.example.com", port: 6543 }));

    expect(mockForward).toHaveBeenCalledWith({
      fromPort: 12345,
      toPort: 6543,
      toHost: "db.example.com",
    });
    expect(mockForwardSocket).not.toHaveBeenCalled();
  });
});