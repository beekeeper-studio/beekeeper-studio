import fs from "fs";
import path from "path";
import os from "os";
import tmp from "tmp";
import { readSshConfig } from "@/lib/ssh/sshConfigReader";

describe("readSshConfig", () => {
  function writeConfig(content: string): string {
    const tmpFile = tmp.fileSync();
    fs.writeFileSync(tmpFile.name, content, "utf-8");
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
});
