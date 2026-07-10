import fs from "fs";
import os from "os";
import path from "path";
import tmp from "tmp";

jest.mock("@commercial/backend/lib/db/server", () => ({
  createServer: jest.fn(),
}));

jest.mock("@/common/bksConfig", () => ({
  __esModule: true,
  default: { security: { disableSshConfigMatchExec: false } },
}));

import connectionProvider from "@commercial/backend/lib/connection-provider";

function makeHop(overrides: Record<string, unknown> = {}, position = 0) {
  return {
    position,
    sshConfig: {
      host: "alias",
      port: null,
      mode: "agent",
      username: null,
      password: null,
      keyfile: null,
      keyfilePassword: null,
      ...overrides,
    },
  };
}

function makeConfig(sshConfigs: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    sshEnabled: true,
    sshConfigs,
    sshKeepaliveInterval: null,
    connectionType: "postgres",
    host: "db.local",
    port: 5432,
    username: "u",
    password: "p",
    ...overrides,
  } as any;
}

describe("connection-provider ssh config warnings", () => {
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

  function writeSshConfig(content: string, mode = 0o600) {
    const configPath = path.join(tmpHome.name, ".ssh", "config");
    fs.writeFileSync(configPath, content, "utf-8");
    // Owner-only so the ownership guard trusts it regardless of the runner umask.
    fs.chmodSync(configPath, mode);
  }

  it("surfaces a warning for a missing IdentityFile in agent mode", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/definitely_missing_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig([makeHop({ mode: "agent" })]),
      "osuser",
      {} as any
    );
    expect(result.sshConfigWarnings).toBeDefined();
    expect(
      result.sshConfigWarnings.some((w: string) => w.includes("definitely_missing_key"))
    ).toBe(true);
  });

  it("does not warn about a missing IdentityFile when not in agent mode", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/definitely_missing_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig([makeHop({ mode: "userpass", password: "x" })]),
      "osuser",
      {} as any
    );
    const warnings = result.sshConfigWarnings || [];
    expect(warnings.some((w: string) => w.includes("definitely_missing_key"))).toBe(false);
  });

  it("applies Match user when resolving IdentityFile, using the hop username", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
Match user deploybot123
  IdentityFile /keys/match_user_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig([makeHop({ mode: "agent", username: "deploybot123" })]),
      "osuser",
      {} as any
    );
    expect(
      result.sshConfigWarnings.some((w: string) => w.includes("match_user_key"))
    ).toBe(true);
  });

  it("collects warnings from every hop, deduped", () => {
    writeSshConfig(`
Host bastion
  HostName bastion.example.com
  IdentityFile /keys/shared_missing_key

Host alias
  HostName real.example.com
  IdentityFile /keys/shared_missing_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig([
        makeHop({ host: "bastion", mode: "agent" }, 0),
        makeHop({ mode: "agent" }, 1),
      ]),
      "osuser",
      {} as any
    );
    const matching = result.sshConfigWarnings.filter((w: string) =>
      w.includes("shared_missing_key")
    );
    expect(matching).toHaveLength(1);
  });

  it("surfaces a warning when the ssh config is world-writable", () => {
    writeSshConfig("Host alias\n  HostName real.example.com\n", 0o666);

    const result = connectionProvider.convertConfig(
      makeConfig([makeHop({ mode: "agent" })]),
      "osuser",
      {} as any
    );
    expect(result.sshConfigWarnings).toBeDefined();
    expect(result.sshConfigWarnings.length).toBeGreaterThan(0);
  });

  it("returns no warnings when ssh is disabled", () => {
    writeSshConfig(`
Host alias
  HostName real.example.com
  IdentityFile /keys/definitely_missing_key
`);
    const result = connectionProvider.convertConfig(
      makeConfig([makeHop({ mode: "agent" })], { sshEnabled: false }),
      "osuser",
      {} as any
    );
    expect(result.sshConfigWarnings).toBeUndefined();
  });
});
