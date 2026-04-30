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
    sshMode: "keyfile",
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

  it("resolves ssh config alias for keyfile mode (not just agent)", () => {
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
        // user did not pick a keyfile or username
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      host: "db.example.com",
      port: 22022,
      user: "admin",
      privateKey: "/keys/prod_key",
    });
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
      privateKey: null, // never set for userpass mode
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
      host: "db.example.com", // alias still resolves to real hostname
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
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh).toMatchObject({
      bastionHost: "jump.example.com",
      bastionPort: 2222,
      bastionUser: "jumper",
      bastionPrivateKey: "/keys/jump_key",
    });
  });

  it("does not pull identityFile for agent mode (the agent supplies the key)", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/should_be_ignored
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "alias",
        sshMode: "agent",
        sshUsername: "u",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.privateKey).toBeNull();
    expect(result.ssh.useAgent).toBe(true);
    expect(result.ssh.host).toBe("real.example.com");
  });

  it("does not pull identityFile for bastion agent mode", () => {
    writeSshConfig(`
Host jump
  HostName jump.example.com
  IdentityFile /keys/should_be_ignored
`);
    const result = connectionProvider.convertConfig(
      makeConfig({
        sshHost: "host",
        sshMode: "userpass",
        sshPassword: "x",
        sshBastionHost: "jump",
        sshBastionMode: "agent",
      }),
      "osuser",
      {} as any
    );
    expect(result.ssh.bastionPrivateKey).toBeNull();
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
