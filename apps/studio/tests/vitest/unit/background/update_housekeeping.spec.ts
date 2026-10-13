// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { cleanUpUpdateFiles, versionFromFileName } from "@/background/update_housekeeping";

const log = { info: () => undefined, warn: () => undefined };

function touch(file: string, content = "") {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

describe("versionFromFileName", () => {
  it.each([
    ["Beekeeper-Studio-5.3.0-arm64-mac.zip", "5.3.0"],
    ["Beekeeper-Studio-Setup-5.3.0.exe", "5.3.0"],
    ["Beekeeper-Studio-5.4.0-beta.2.AppImage", "5.4.0-beta.2"],
    ["Beekeeper-Studio-5.4.0-beta.2-arm64-mac.zip", "5.4.0-beta.2"],
    ["update-info.json", null],
  ])("%s -> %s", (fileName, expected) => {
    expect(versionFromFileName(fileName)).toBe(expected);
  });
});

describe("cleanUpUpdateFiles", () => {
  let root: string;
  let updaterCacheDir: string;
  let pendingDir: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "bks-update-housekeeping-"));
    updaterCacheDir = path.join(root, "app-updater");
    pendingDir = path.join(updaterCacheDir, "pending");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function pendingUpdate(fileName: string) {
    touch(path.join(pendingDir, fileName));
    touch(path.join(pendingDir, "update-info.json"), JSON.stringify({ fileName, sha512: "x" }));
  }

  const run = (overrides = {}) =>
    cleanUpUpdateFiles({ updaterCacheDir, currentVersion: "5.3.0", updatesEnabled: true, log, ...overrides });

  it("removes a pending update that is already installed", async () => {
    pendingUpdate("App-Setup-5.3.0.exe");
    touch(path.join(updaterCacheDir, "update.zip"));

    await run();

    expect(existsSync(pendingDir)).toBe(false);
    // kept as the base for differential downloads
    expect(existsSync(path.join(updaterCacheDir, "update.zip"))).toBe(true);
  });

  it("removes a pending update older than the running version", async () => {
    pendingUpdate("App-5.2.1.AppImage");
    await run();
    expect(existsSync(pendingDir)).toBe(false);
  });

  it("keeps a pending update that has not been installed yet", async () => {
    pendingUpdate("App-5.4.0-beta.1-arm64-mac.zip");
    await run();
    expect(readdirSync(pendingDir).sort()).toEqual(["App-5.4.0-beta.1-arm64-mac.zip", "update-info.json"]);
  });

  it("falls back to file names when update-info.json is missing", async () => {
    touch(path.join(pendingDir, "App-Setup-5.2.0.exe"));
    touch(path.join(pendingDir, "App-Setup-5.3.0.exe"));
    await run();
    expect(existsSync(pendingDir)).toBe(false);
  });

  it("removes interrupted temp downloads but keeps a newer pending update", async () => {
    pendingUpdate("App-Setup-5.4.0.exe");
    touch(path.join(pendingDir, "temp-App-Setup-5.4.0.exe"));
    touch(path.join(pendingDir, "0-temp-App-Setup-5.4.0.exe"));

    await run();

    expect(readdirSync(pendingDir).sort()).toEqual(["App-Setup-5.4.0.exe", "update-info.json"]);
  });

  it("removes the whole updater cache when updates are disabled", async () => {
    pendingUpdate("App-Setup-5.4.0.exe");
    touch(path.join(updaterCacheDir, "current.blockmap"));

    await run({ updatesEnabled: false });

    expect(existsSync(updaterCacheDir)).toBe(false);
  });

  describe("ShipIt cache", () => {
    let shipItCacheDir: string;

    beforeEach(() => {
      shipItCacheDir = path.join(root, "com.example.app.ShipIt");
      for (const name of ["ShipIt_stderr.log", "ShipIt_stdout.log", "ShipIt_stderr.log.1", "ShipIt_stdout.log.12"]) {
        touch(path.join(shipItCacheDir, name));
      }
      touch(path.join(shipItCacheDir, "update.active", "App.app", "Contents", "Info.plist"));
      touch(path.join(shipItCacheDir, "update.orphan", "App.app", "Contents", "Info.plist"));
    });

    function writeState() {
      const bundle = path.join(shipItCacheDir, "update.active", "App.app");
      touch(
        path.join(shipItCacheDir, "ShipItState.plist"),
        JSON.stringify({ updateBundleURL: `file://${encodeURI(bundle)}/` })
      );
    }

    it("removes logs and orphaned bundles, keeping the active one", async () => {
      writeState();
      await run({ shipItCacheDir });
      expect(readdirSync(shipItCacheDir).sort()).toEqual(["ShipItState.plist", "update.active"]);
    });

    it("removes all staged bundles when there is no state file", async () => {
      await run({ shipItCacheDir });
      expect(readdirSync(shipItCacheDir)).toEqual([]);
    });

    it("cleans ShipIt without an updater cache", async () => {
      pendingUpdate("App-Setup-5.2.0.exe");
      await run({ updaterCacheDir: undefined, shipItCacheDir });
      expect(existsSync(path.join(pendingDir, "App-Setup-5.2.0.exe"))).toBe(true);
      expect(readdirSync(shipItCacheDir)).not.toContain("ShipIt_stderr.log");
    });

    it("keeps staged bundles when the state file cannot be parsed", async () => {
      touch(path.join(shipItCacheDir, "ShipItState.plist"), "bplist00");
      await run({ shipItCacheDir });
      expect(readdirSync(shipItCacheDir)).toEqual(
        expect.arrayContaining(["update.active", "update.orphan"])
      );
      expect(readdirSync(shipItCacheDir)).not.toContain("ShipIt_stdout.log.12");
    });
  });
});
