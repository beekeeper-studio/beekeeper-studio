// Regression tests for https://github.com/beekeeper-studio/beekeeper-studio/issues/4193
// SSH agent mode must not attempt to read a private key file from disk.

import type { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from "@/lib/db/types";
import fs from "fs";
import os from "os";
import path from "path";

const mockReadFileSync = jest.fn();
const mockSshConnectionForward = jest.fn().mockResolvedValue({});
const mockSshConnectionCtor = jest.fn();
let lastSshConfig: any;

jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return { ...actual, readFileSync: (...args: any[]) => mockReadFileSync(...args) };
});

jest.mock("@/vendor/node-ssh-forward/index", () => ({
  SSHConnection: class {
    constructor(opts: any) {
      lastSshConfig = opts;
      mockSshConnectionCtor(opts);
    }
    forward = mockSshConnectionForward;
  },
}));

jest.mock("portfinder", () => ({
  __esModule: true,
  default: { getPortPromise: jest.fn().mockResolvedValue(12345) },
  getPortPromise: jest.fn().mockResolvedValue(12345),
}));

jest.mock("@/common/platform_info", () => ({
  __esModule: true,
  default: { sshAuthSock: "/tmp/test-agent.sock" },
}));

jest.mock("@bksLogger", () => ({
  __esModule: true,
  default: {
    scope: () => ({
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

jest.mock("@/handlers/utils", () => ({
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

function buildConfig(ssh: IDbConnectionServerSSHConfig): IDbConnectionServerConfig {
  return {
    client: "postgresql" as any,
    host: "127.0.0.1",
    port: 5432,
    domain: null,
    socketPath: null,
    socketPathEnabled: false,
    user: "user",
    osUser: "user",
    password: null,
    ssh,
    sslCaFile: null,
    sslCertFile: null,
    sslKeyFile: null,
    sslRejectUnauthorized: false,
    ssl: false,
    readOnlyMode: false,
  } as IDbConnectionServerConfig;
}

describe("connectTunnel SSH agent handling (#4193)", () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockSshConnectionCtor.mockReset();
    lastSshConfig = undefined;
    // Default: pretend any file read succeeds, returning a buffer.
    mockReadFileSync.mockReturnValue(Buffer.from("KEY"));
  });

  it("reads the private key file when useAgent is false and privateKey is set", async () => {
    const ssh = buildSsh({
      useAgent: false,
      privateKey: "/keys/keyfile",
    });

    await connectTunnel(buildConfig(ssh));

    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain("/keys/keyfile");
    expect(lastSshConfig.privateKey).toEqual(Buffer.from("KEY"));
  });

  it("reads the bastion private key file when bastionMode is 'keyfile'", async () => {
    const ssh = buildSsh({
      bastionHost: "bastion.example.com",
      bastionMode: "keyfile",
      bastionPrivateKey: "/keys/bastion_key",
    });

    await connectTunnel(buildConfig(ssh));

    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain("/keys/bastion_key");
  });

  // Regression for https://github.com/beekeeper-studio/beekeeper-studio/issues/4366
  // Automatic (agent) mode must skip ~/.ssh/config IdentityFile entries it can't
  // read, mirroring ssh(1), instead of throwing and aborting the connection.
  it("agent mode skips a missing IdentityFile and reads the next existing one (#4366)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-tunnel-4366-"));
    const goodKey = path.join(dir, "id_ed25519");
    fs.writeFileSync(goodKey, "PRIVATE KEY DATA");
    const badKey = path.join(dir, "missing_key");

    // connection-provider copies the first IdentityFile into privateKey and
    // passes the full ordered list as identityFiles.
    const ssh = buildSsh({
      useAgent: true,
      privateKey: badKey,
      identityFiles: [badKey, goodKey],
      identitiesOnly: false,
    });

    await connectTunnel(buildConfig(ssh));

    // The missing entry is skipped; only the existing key is read.
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain(goodKey);
    expect(mockReadFileSync.mock.calls[0][0]).not.toContain("missing_key");
    expect(lastSshConfig.privateKey).toEqual(Buffer.from("KEY"));
    expect(lastSshConfig.authHandler).toEqual(["none", "agent", "publickey"]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("agent mode does not throw when the only IdentityFile is missing (#4366)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-tunnel-4366b-"));
    const badKey = path.join(dir, "missing_key");

    const ssh = buildSsh({
      useAgent: true,
      privateKey: badKey,
      identityFiles: [badKey],
      identitiesOnly: false,
    });

    // Must resolve (fall back to the agent) rather than reject with ENOENT.
    await expect(connectTunnel(buildConfig(ssh))).resolves.toBeDefined();
    expect(mockReadFileSync.mock.calls.every((c) => !String(c[0]).includes("missing_key"))).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
