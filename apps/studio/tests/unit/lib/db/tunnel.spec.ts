// Regression tests for SSH auth handling in the tunnel:
//  - https://github.com/beekeeper-studio/beekeeper-studio/issues/4193
//    agent mode must not attempt to read an explicit private key file
//  - https://github.com/beekeeper-studio/beekeeper-studio/issues/4366
//    agent mode must skip IdentityFile entries it can't read
//  - https://github.com/beekeeper-studio/beekeeper-studio/issues/4358
//    every hop must offer 'none' as an auth fallback

import type { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from "@/lib/db/types";
import type { SshConfigResult } from "@/lib/ssh/sshConfigReader";
import fs from "fs";
import os from "os";
import path from "path";

const mockReadFileSync = jest.fn();
const mockReadSshConfig = jest.fn();
const mockSshConnectionForward = jest.fn().mockResolvedValue({});
let lastSshConfig: any;

jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return { ...actual, readFileSync: (...args: any[]) => mockReadFileSync(...args) };
});

jest.mock("@/lib/ssh/sshConfigReader", () => ({
  readSshConfig: (...args: any[]) => mockReadSshConfig(...args),
}));

jest.mock("@/vendor/node-ssh-forward/index", () => ({
  SSHConnection: class {
    constructor(opts: any) {
      lastSshConfig = opts;
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

function buildHop(overrides: Record<string, unknown> = {}, position = 0) {
  return {
    position,
    sshConfig: {
      host: "remote.example.com",
      port: null,
      mode: "agent",
      username: null,
      password: null,
      keyfile: null,
      keyfilePassword: null,
      ...overrides,
    },
  } as any;
}

function buildSsh(configs: any[], overrides: Partial<IDbConnectionServerSSHConfig> = {}): IDbConnectionServerSSHConfig {
  return {
    enabled: true,
    keepaliveInterval: 0,
    configs,
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

describe("connectTunnel ssh auth handling", () => {
  let emptyHome: string;

  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockReturnValue(Buffer.from("KEY"));
    mockReadSshConfig.mockReset();
    mockReadSshConfig.mockImplementation((host: string): SshConfigResult => ({ host }));
    lastSshConfig = undefined;

    // No default identity files, so agent mode never picks one up implicitly.
    emptyHome = fs.mkdtempSync(path.join(os.tmpdir(), "bks-tunnel-home-"));
    jest.spyOn(os, "homedir").mockReturnValue(emptyHome);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(emptyHome, { recursive: true, force: true });
  });

  it("reads the private key file for a keyfile hop", async () => {
    await connectTunnel(buildConfig(buildSsh([
      buildHop({ mode: "keyfile", keyfile: "/keys/keyfile", keyfilePassword: "secret" }),
    ])));

    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain("/keys/keyfile");
    expect(lastSshConfig.privateKey).toEqual(Buffer.from("KEY"));
    expect(lastSshConfig.passphrase).toBe("secret");
    expect(lastSshConfig.agentForward).toBe(false);
  });

  it("does not read a key file for an agent hop with no IdentityFile (#4193)", async () => {
    await connectTunnel(buildConfig(buildSsh([buildHop({ mode: "agent" })])));

    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(lastSshConfig.privateKey).toBeUndefined();
    expect(lastSshConfig.agentForward).toBe(true);
    expect(lastSshConfig.agent).toBe("/tmp/test-agent.sock");
    expect(lastSshConfig.authHandler).toEqual(["none", "agent"]);
  });

  it("ignores IdentityFile entries for a keyfile hop", async () => {
    mockReadSshConfig.mockReturnValue({
      host: "real.example.com",
      identityFiles: ["/keys/from_config"],
    } as SshConfigResult);

    await connectTunnel(buildConfig(buildSsh([
      buildHop({ mode: "keyfile", keyfile: "/keys/explicit" }),
    ])));

    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain("/keys/explicit");
    expect(lastSshConfig.authHandler).toEqual(["none", "publickey"]);
  });

  it("resolves alias hostname, port and user from ssh config", async () => {
    mockReadSshConfig.mockReturnValue({
      host: "real.example.com",
      port: 2222,
      user: "configuser",
    } as SshConfigResult);

    await connectTunnel(buildConfig(buildSsh([buildHop({ host: "alias" })])));

    expect(mockReadSshConfig).toHaveBeenCalledWith("alias", undefined, undefined);
    expect(lastSshConfig.endHost).toBe("real.example.com");
    expect(lastSshConfig.endPort).toBe(2222);
    expect(lastSshConfig.username).toBe("configuser");
  });

  it("prefers user-entered port and username over ssh config", async () => {
    mockReadSshConfig.mockReturnValue({
      host: "real.example.com",
      port: 2222,
      user: "configuser",
    } as SshConfigResult);

    await connectTunnel(buildConfig(buildSsh([
      buildHop({ host: "alias", port: 2200, username: "typeduser" }),
    ])));

    expect(mockReadSshConfig).toHaveBeenCalledWith("alias", undefined, "typeduser");
    expect(lastSshConfig.endPort).toBe(2200);
    expect(lastSshConfig.username).toBe("typeduser");
  });

  it("agent mode skips a missing IdentityFile and reads the next existing one (#4366)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-tunnel-4366-"));
    const goodKey = path.join(dir, "id_ed25519");
    fs.writeFileSync(goodKey, "PRIVATE KEY DATA");
    const badKey = path.join(dir, "missing_key");

    mockReadSshConfig.mockReturnValue({
      host: "real.example.com",
      identityFiles: [badKey, goodKey],
      identitiesOnly: false,
    } as SshConfigResult);

    await connectTunnel(buildConfig(buildSsh([buildHop({ mode: "agent" })])));

    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync.mock.calls[0][0]).toContain(goodKey);
    expect(mockReadFileSync.mock.calls[0][0]).not.toContain("missing_key");
    expect(lastSshConfig.privateKey).toEqual(Buffer.from("KEY"));
    expect(lastSshConfig.authHandler).toEqual(["none", "agent", "publickey"]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("agent mode does not throw when the only IdentityFile is missing (#4366)", async () => {
    const badKey = path.join(emptyHome, "missing_key");
    mockReadSshConfig.mockReturnValue({
      host: "real.example.com",
      identityFiles: [badKey],
      identitiesOnly: false,
    } as SshConfigResult);

    await expect(
      connectTunnel(buildConfig(buildSsh([buildHop({ mode: "agent" })])))
    ).resolves.toBeDefined();
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it("offers 'none' as an auth fallback for a password hop (#4358)", async () => {
    await connectTunnel(buildConfig(buildSsh([
      buildHop({ mode: "userpass", username: "u", password: "p" }),
    ])));

    expect(lastSshConfig.password).toBe("p");
    expect(lastSshConfig.authHandler).toEqual(["none", "password"]);
  });

  it("chains jump hosts in position order, connecting to the last hop directly", async () => {
    await connectTunnel(buildConfig(buildSsh([
      buildHop({ host: "second.example.com", mode: "userpass", password: "b" }, 1),
      buildHop({ host: "first.example.com", mode: "userpass", password: "a" }, 0),
    ])));

    expect(lastSshConfig.jumpHosts).toHaveLength(1);
    expect(lastSshConfig.jumpHosts[0].host).toBe("first.example.com");
    expect(lastSshConfig.jumpHosts[0].password).toBe("a");
    expect(lastSshConfig.jumpHosts[0].authHandler).toEqual(["none", "password"]);
    expect(lastSshConfig.endHost).toBe("second.example.com");
    expect(lastSshConfig.password).toBe("b");
  });
});
