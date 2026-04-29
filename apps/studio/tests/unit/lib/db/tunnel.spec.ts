// Regression tests for https://github.com/beekeeper-studio/beekeeper-studio/issues/4193
// SSH agent mode must not attempt to read a private key file from disk.

import type { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from "@/lib/db/types";

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

  it("does not read the private key file when useAgent is true, even if privateKey is set", async () => {
    const ssh = buildSsh({
      useAgent: true,
      // Mimics connection-provider populating privateKey from SSH config IdentityFile
      privateKey: "/nonexistent/.ssh/id_rsa",
    });

    await connectTunnel(buildConfig(ssh));

    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(lastSshConfig.privateKey).toBeUndefined();
    expect(lastSshConfig.agentForward).toBe(true);
    expect(lastSshConfig.agentSocket).toBe("/tmp/test-agent.sock");
  });

  it("does not surface ENOENT when SSH agent mode is used and the IdentityFile path is missing", async () => {
    mockReadFileSync.mockImplementation((p: string) => {
      const err: any = new Error(`ENOENT: no such file or directory, open '${p}'`);
      err.code = "ENOENT";
      throw err;
    });

    const ssh = buildSsh({
      useAgent: true,
      privateKey: "/Users/anyone/.ssh/id_rsa",
    });

    await expect(connectTunnel(buildConfig(ssh))).resolves.toBeDefined();
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

  it("does not read the bastion private key file when bastionMode is 'agent'", async () => {
    const ssh = buildSsh({
      bastionHost: "bastion.example.com",
      bastionMode: "agent",
      bastionPrivateKey: "/nonexistent/bastion_key",
    });

    await connectTunnel(buildConfig(ssh));

    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(lastSshConfig.bastionPrivateKey).toBeUndefined();
    expect(lastSshConfig.bastionAgentForward).toBe(true);
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
});
