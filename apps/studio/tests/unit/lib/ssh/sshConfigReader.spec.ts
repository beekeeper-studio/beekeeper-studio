import fs from "fs";
import path from "path";
import os from "os";
import tmp from "tmp";

// Lazily read via a getter so the value is resolved at call time (after this
// initializes), not when jest evaluates the mock factory.
let mockDisableSshConfigMatchExec = false;
jest.mock("@/common/bksConfig", () => ({
  __esModule: true,
  default: {
    security: {
      get disableSshConfigMatchExec() {
        return mockDisableSshConfigMatchExec;
      },
    },
  },
}));

import { readSshConfig } from "@/lib/ssh/sshConfigReader";

describe("readSshConfig", () => {
  // ssh-config ownership/permission checks are POSIX-specific (uid + mode bits).
  const itPosix = typeof process.getuid === "function" ? it : it.skip;

  beforeEach(() => {
    mockDisableSshConfigMatchExec = false;
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

  it("skips Match exec sections when [security] disableSshConfigMatchExec is true", () => {
    mockDisableSshConfigMatchExec = true;
    const configPath = writeConfig(`
Host myserver
  HostName real.example.com
  IdentityFile /keys/host_key
Match exec "true"
  IdentityFile /keys/exec_key`);

    const result = readSshConfig("myserver", configPath);
    // Host block still applies; the Match exec block is skipped (its command
    // is never run), so its IdentityFile is not added.
    expect(result.host).toBe("real.example.com");
    expect(result.identityFiles).toEqual(["/keys/host_key"]);
    expect(result.identityFiles).not.toContain("/keys/exec_key");
  });

  it("still applies non-exec Match rules when disableSshConfigMatchExec is true", () => {
    mockDisableSshConfigMatchExec = true;
    const configPath = writeConfig(`
Match host myserver
  IdentityFile /keys/match_host_key`);

    const result = readSshConfig("myserver", configPath);
    expect(result.identityFile).toBe("/keys/match_host_key");
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

  // Include fixtures use absolute paths in their own tmp dir — relative
  // patterns resolve against the real ~/.ssh, which tests must not touch.
  function writeIncludeFile(dir: string, name: string, content: string): string {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content, "utf-8");
    fs.chmodSync(filePath, 0o600);
    return filePath;
  }

  describe("Include directive", () => {
    it("resolves directives from an included file", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      const included = writeIncludeFile(dir, "extra.conf", `
Host myserver
  HostName real.example.com
  IdentityFile /keys/included_key`);
      const configPath = writeConfig(`Include ${included}`);

      const result = readSshConfig("myserver", configPath);
      expect(result.host).toBe("real.example.com");
      expect(result.identityFile).toBe("/keys/included_key");
    });

    it("expands glob patterns", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      writeIncludeFile(dir, "match.conf", `
Host myserver
  HostName from-glob.example.com`);
      writeIncludeFile(dir, "skipped.txt", `
Host myserver
  Port 9999`);
      const configPath = writeConfig(`Include ${path.join(dir, "*.conf")}`);

      const result = readSshConfig("myserver", configPath);
      expect(result.host).toBe("from-glob.example.com");
      expect(result.port).toBeUndefined();
    });

    it("resolves includes nested multiple layers deep", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      const inner = writeIncludeFile(dir, "inner.conf", `
Host myserver
  IdentityFile /keys/nested_key`);
      const middle = writeIncludeFile(dir, "middle.conf", `Include ${inner}`);
      const configPath = writeConfig(`Include ${middle}`);

      const result = readSshConfig("myserver", configPath);
      expect(result.identityFile).toBe("/keys/nested_key");
    });

    it("expands includes in configs with CRLF line endings", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      const included = writeIncludeFile(dir, "extra.conf", `
Host myserver
  HostName crlf.example.com`);
      const configPath = writeConfig(`Include ${included}\r\nHost other\r\n  Port 1\r\n`);

      const result = readSshConfig("myserver", configPath);
      expect(result.host).toBe("crlf.example.com");
    });

    it("ignores circular includes", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      const aPath = path.join(dir, "a.conf");
      const bPath = path.join(dir, "b.conf");
      writeIncludeFile(dir, "a.conf", `Include ${bPath}
Host myserver
  Port 2200`);
      writeIncludeFile(dir, "b.conf", `Include ${aPath}`);
      const configPath = writeConfig(`Include ${aPath}`);

      const result = readSshConfig("myserver", configPath);
      expect(result.port).toBe(2200);
      expect(result.warnings).toBeUndefined();
    });

    itPosix("skips an untrusted included file and warns", () => {
      const dir = tmp.dirSync({ unsafeCleanup: true }).name;
      const included = writeIncludeFile(dir, "loose.conf", `
Host myserver
  IdentityFile /keys/should_be_ignored`);
      fs.chmodSync(included, 0o666);
      const configPath = writeConfig(`
Include ${included}
Host myserver
  HostName real.example.com`);

      const result = readSshConfig("myserver", configPath);
      // The trusted parts of the config still apply.
      expect(result.host).toBe("real.example.com");
      expect(result.identityFile).toBeUndefined();
      expect(result.warnings).toEqual([
        expect.objectContaining({ code: "untrusted" }),
      ]);
    });
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
