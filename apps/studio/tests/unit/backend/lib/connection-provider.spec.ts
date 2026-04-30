import fs from "fs";
import os from "os";
import path from "path";
import tmp from "tmp";

jest.mock("@commercial/backend/lib/db/server", () => ({
  createServer: jest.fn(),
}));

import connectionProvider from "@commercial/backend/lib/connection-provider";

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    sshEnabled: true,
    sshHost: "",
    sshPort: null,
    sshUsername: "",
    sshKeyfile: null,
    sshKeyfilePassword: null,
    sshPassword: null,
    sshMode: "auto",
    sshKeepaliveInterval: null,
    sshBastionHost: "",
    sshBastionHostPort: null,
    sshBastionUsername: "",
    sshBastionKeyfile: null,
    sshBastionKeyfilePassword: null,
    sshBastionPassword: null,
    sshBastionMode: null,
    connectionType: "postgres",
    host: "db.local",
    port: 5432,
    username: "u",
    password: "p",
    ...overrides,
  } as any;
}

describe("connection-provider SSH config merging", () => {
  let originalHome: string | undefined;
  let tmpHome: tmp.DirResult;

  beforeEach(() => {
    originalHome = process.env.HOME;
    tmpHome = tmp.dirSync({ unsafeCleanup: true });
    process.env.HOME = tmpHome.name;
    jest.spyOn(os, "homedir").mockReturnValue(tmpHome.name);
    fs.mkdirSync(path.join(tmpHome.name, ".ssh"), { recursive: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    tmpHome.removeCallback();
  });

  function writeSshConfig(content: string) {
    fs.writeFileSync(path.join(tmpHome.name, ".ssh", "config"), content, "utf-8");
  }

  it("resolves alias hostname/port/user for keyfile mode", () => {
    writeSshConfig(`
Host production
  HostName db.example.com
  Port 22022
  User admin
  IdentityFile /keys/prod_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "production",
        sshMode: "keyfile",
        sshKeyfile: "/keys/explicit",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      host: "db.example.com",
      port: 22022,
      user: "admin",
      privateKey: "/keys/explicit",
    });
  });

  it("keyfile mode does not pull IdentityFile from ssh config", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/should_be_ignored
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "keyfile",
        // no sshKeyfile selected — must NOT auto-fill from ssh config
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.privateKey).toBeNull();
    expect(result.ssh.host).toBe("real.example.com");
    expect(result.ssh.identityFiles).toBeUndefined();
    expect(result.ssh.identitiesOnly).toBeUndefined();
  });

  it("resolves ssh config alias for userpass mode", () => {
    writeSshConfig(`
Host stage
  HostName stage.internal
  Port 2200
  User stageuser
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "stage",
        sshMode: "userpass",
        sshPassword: "secret",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      host: "stage.internal",
      port: 2200,
      user: "stageuser",
      password: "secret",
      privateKey: null,
    });
  });

  it("user-entered values take precedence over ssh config", () => {
    writeSshConfig(`
Host production
  HostName db.example.com
  Port 22022
  User admin
  IdentityFile /keys/prod_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "production",
        sshPort: 4242,
        sshUsername: "explicit",
        sshKeyfile: "/keys/explicit",
        sshMode: "keyfile",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      host: "db.example.com",
      port: 4242,
      user: "explicit",
      privateKey: "/keys/explicit",
    });
  });

  it("resolves bastion alias regardless of bastion mode", () => {
    writeSshConfig(`
Host jump
  HostName jump.example.com
  Port 2222
  User jumper
  IdentityFile /keys/jump_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "db.internal",
        sshMode: "userpass",
        sshPassword: "x",
        sshBastionHost: "jump",
        sshBastionMode: "keyfile",
        sshBastionKeyfile: "/keys/explicit_bastion",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      bastionHost: "jump.example.com",
      bastionPort: 2222,
      bastionUser: "jumper",
      bastionPrivateKey: "/keys/explicit_bastion",
    });
  });

  it("auto mode pulls IdentityFile from ssh config", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/auto_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "auto",
        sshUsername: "u",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.useAgent).toBe(true);
    expect(result.ssh.privateKey).toBe("/keys/auto_key");
    expect(result.ssh.identityFiles).toEqual(["/keys/auto_key"]);
    expect(result.ssh.identitiesOnly).toBe(false);
    expect(result.ssh.host).toBe("real.example.com");
  });

  it("auto mode propagates IdentitiesOnly yes", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/strict
  IdentitiesOnly yes
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "auto",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.useAgent).toBe(true);
    expect(result.ssh.identitiesOnly).toBe(true);
    expect(result.ssh.privateKey).toBe("/keys/strict");
    expect(result.ssh.identityFiles).toEqual(["/keys/strict"]);
  });

  it("auto mode without IdentityFile leaves identitiesOnly false and privateKey null", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "auto",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.useAgent).toBe(true);
    expect(result.ssh.privateKey).toBeNull();
    expect(result.ssh.identitiesOnly).toBe(false);
    expect(result.ssh.identityFiles).toBeUndefined();
  });

  it("bastion auto mode pulls IdentityFile and IdentitiesOnly", () => {
    writeSshConfig(`
Host jump
  HostName jump.example.com
  IdentityFile /keys/jump_fallback
  IdentitiesOnly yes
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "host",
        sshMode: "userpass",
        sshPassword: "x",
        sshBastionHost: "jump",
        sshBastionMode: "auto",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.bastionPrivateKey).toBe("/keys/jump_fallback");
    expect(result.ssh.bastionIdentityFiles).toEqual(["/keys/jump_fallback"]);
    expect(result.ssh.bastionIdentitiesOnly).toBe(true);
    expect(result.ssh.bastionHost).toBe("jump.example.com");
  });

  it("does not pull identityFile for userpass mode", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/should_be_ignored
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "userpass",
        sshPassword: "x",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.privateKey).toBeNull();
    expect(result.ssh.host).toBe("real.example.com");
  });

  it("trims bastion host", () => {
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "host",
        sshMode: "userpass",
        sshPassword: "x",
        sshBastionHost: "  bastion.example.com  ",
        sshBastionMode: "userpass",
        sshBastionPassword: "y",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.bastionHost).toBe("bastion.example.com");
  });
});
