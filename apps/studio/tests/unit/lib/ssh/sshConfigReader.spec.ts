import fs from "fs";
import path from "path";
import os from "os";
import tmp from "tmp";

// Lazily read via a getter so the value is resolved at call time (after this
// initializes), not when jest evaluates the mock factory.
let mockAllowSshConfigMatch = true;
jest.mock("@/common/bksConfig", () => ({
  __esModule: true,
  default: {
    security: {
      get allowSshConfigMatch() {
        return mockAllowSshConfigMatch;
      },
    },
  },
}));

import { readSshConfig } from "@/lib/ssh/sshConfigReader";

describe("readSshConfig", () => {
  // ssh-config ownership/permission checks are POSIX-specific (uid + mode bits).
  const itPosix = typeof process.getuid === "function" ? it : it.skip;

  beforeEach(() => {
    mockAllowSshConfigMatch = true;
  });

  function writeConfig(content: string): string {
    const tmpFile = tmp.fileSync();
    fs.writeFileSync(tmpFile.name, content, "utf-8");
    // Keep the fixture trusted (owner-only) so the ownership guard doesn't
    // reject it regardless of the test runner's umask.
    fs.chmodSync(tmpFile.name, 0o600);
    return tmpFile.name;
  }

  it("should resolve all fields together", () => {
    const configPath = writeConfig(`
Host production
  HostName db.example.com
  Port 22022
  User admin
  IdentityFile /keys/prod_key`);

    const result = readSshConfig("production", configPath);
    expect(result).toEqual({
      host: "db.example.com",
      port: 22022,
      user: "admin",
      identityFile: "/keys/prod_key",
      identityFiles: ["/keys/prod_key"],
    });
  });

  it("should return just the host when config file does not exist", () => {
    const tmpFile = tmp.fileSync();
    const missing = tmpFile.name + "_nonexistent";
    tmpFile.removeCallback();
    const result = readSshConfig("myserver", missing);
    expect(result).toEqual({ host: "myserver" });
  });

  it("should return just the host when there is no matching entry", () => {
    const configPath = writeConfig(`
Host other-server
  HostName 10.0.0.1
  User admin
  Port 2222`);

    const result = readSshConfig("myserver", configPath);
    expect(result).toEqual({ host: "myserver" });
  });

  it("should resolve IdentityFile with ~ to absolute path", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile ~/.ssh/id_ed25519`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFile).toBe(
      path.join(os.homedir(), ".ssh", "id_ed25519")
    );
  });

  it("should handle absolute IdentityFile paths without modification", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile /etc/ssh/custom_key`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFile).toBe("/etc/ssh/custom_key");
  });

  it("returns multiple IdentityFile entries in order", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile /keys/a
  IdentityFile /keys/b`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFiles).toEqual(["/keys/a", "/keys/b"]);
    expect(result.identityFile).toBe("/keys/a");
  });

  it("parses IdentitiesOnly yes", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile /keys/a
  IdentitiesOnly yes`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identitiesOnly).toBe(true);
  });

  it("parses IdentitiesOnly no", () => {
    const configPath = writeConfig(`
Host myserver
  IdentitiesOnly no`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identitiesOnly).toBe(false);
  });

  it("leaves identitiesOnly undefined when the directive is absent", () => {
    const configPath = writeConfig(`
Host myserver
  HostName real.example.com`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identitiesOnly).toBeUndefined();
  });

  // Match rules are evaluated by ssh-config's compute(), but `Match user` /
  // `Match localuser` compare against the user in the compute context. When no
  // username is supplied that defaults to the OS user, so user-based Match
  // blocks never fire. The connection username must be passed through.
  it("applies Match user rules using the supplied ssh username", () => {
    const configPath = writeConfig(`
Host myserver
  HostName real.example.com
Match user deploybot123
  IdentityFile /keys/match_user_key`);

    const result = readSshConfig("myserver", configPath, "deploybot123");
    expect(result.identityFile).toBe("/keys/match_user_key");
    expect(result.identityFiles).toEqual(["/keys/match_user_key"]);
  });

  it("does not apply Match user rules for a different username", () => {
    const configPath = writeConfig(`
Host myserver
  HostName real.example.com
Match user deploybot123
  IdentityFile /keys/match_user_key`);

    const result = readSshConfig("myserver", configPath, "someone-else");
    expect(result.identityFile).toBeUndefined();
  });

  it("still applies Match host rules without a username", () => {
    const configPath = writeConfig(`
Match host myserver
  IdentityFile /keys/match_host_key`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFile).toBe("/keys/match_host_key");
  });

  it("ignores Match blocks when [security] allowSshConfigMatch is false", () => {
    mockAllowSshConfigMatch = false;
    const configPath = writeConfig(`
Host myserver
  HostName real.example.com
Match host real.example.com
  IdentityFile /keys/match_host_key`);

    const result = readSshConfig("myserver", configPath);
    // Host block still applies; the Match block is ignored entirely.
    expect(result.host).toBe("real.example.com");
    expect(result.identityFile).toBeUndefined();
  });

  // `Match exec` runs an arbitrary command via ssh-config's compute(). Mirror
  // OpenSSH: only honour the config if it's owned by the user and not group/
  // world-writable, so an untrusted config can't trigger command execution
  // (or inject any other directive).
  itPosix("ignores the config when it is group/world-writable", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile /keys/should_be_ignored`);
    fs.chmodSync(configPath, 0o666);

    const result = readSshConfig("myserver", configPath);
    expect(result.host).toBe("myserver");
    expect(result.identityFile).toBeUndefined();
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "untrusted" }),
    ]);
  });

  it("warns when the config cannot be parsed", () => {
    const configPath = writeConfig(`Host myserver\n  IdentityFile "unterminated`);

    const result = readSshConfig("myserver", configPath);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "invalid" }),
    ]);
  });

  itPosix("reads the config when owner-only and not group/world-writable", () => {
    const configPath = writeConfig(`
Host myserver
  IdentityFile /keys/ok`);
    fs.chmodSync(configPath, 0o600);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFile).toBe("/keys/ok");
  });
});
