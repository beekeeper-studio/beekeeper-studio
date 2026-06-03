/*
 * Regression coverage for issue #4355:
 *   "BUG: Beekeeper does not follow symlinks (e.g. for az-cli)"
 *   https://github.com/beekeeper-studio/beekeeper-studio/issues/4355
 *
 * Homebrew exposes a stable symlink (e.g. /opt/homebrew/bin/az) that always
 * points at the currently-installed version under the Cellar
 * (e.g. /opt/homebrew/Cellar/azure-cli/2.85.0/bin/az). The report is that
 * Beekeeper persists the *resolved, version-pinned* target rather than the
 * stable symlink, so after `brew upgrade` the stored path no longer exists and
 * the tool integration silently breaks.
 *
 * These tests exercise — against the REAL filesystem, with NO mocks — every
 * place the app touches an executable, to confirm or disprove the bug at each:
 *
 *   1. backup/whichDumpTool  (auto-discovery via `which`/`where`)
 *        -> DISPROVES: `which` returns the symlink, not the Cellar target.
 *   2. backup/runCommand     (spawn of the configured dumpToolPath)
 *        -> DISPROVES: spawning the symlink follows it at runtime, so it keeps
 *           working across a `brew upgrade`.
 *   3. The file-picker save path (what Electron's showOpenDialogSync returns on
 *      macOS: the resolved target — see the screenshot in the issue).
 *        -> CONFIRMS: persisting the resolved target breaks after `brew upgrade`.
 *           This is the failing reproduction. The assertion encodes the desired
 *           post-fix behaviour (the configured tool must still run).
 *
 * The Electron dialog itself can't run under jest, so case 3 reproduces exactly
 * what it persists by resolving the symlink with fs.realpathSync — the same real
 * filesystem operation, no stubbing.
 */
import fs from "fs";
import os from "os";
import path from "path";
import Vue from "vue";
import { Command } from "@/lib/db/models";
import { installUtilStub, UtilStub } from "./setup";

// `which`/`where` and POSIX symlink semantics; the rig is unix-oriented.
const describeOrSkip = process.platform === "win32" ? describe.skip : describe;

describeOrSkip("Tool path symlink resolution (issue #4355)", () => {
  let stub: UtilStub;
  let prefix: string; // fake Homebrew prefix
  let binDir: string; // <prefix>/bin   (stable, on PATH)
  let cellarDir: string; // <prefix>/Cellar (versioned)
  let symlinkPath: string; // <prefix>/bin/<tool>  -> Cellar/<tool>-<ver>/bin/<tool>
  let plantedOnPath: string | null = null; // symlink planted on the real PATH for `which`

  // A tool name unlikely to collide with anything actually on PATH, so that
  // `which` only finds the one we plant under our fake Homebrew prefix.
  const toolName = `bks-faketool-${process.pid}`;

  function installVersion(version: string): string {
    const versionBin = path.join(cellarDir, `${toolName}-${version}`, "bin");
    fs.mkdirSync(versionBin, { recursive: true });
    const exe = path.join(versionBin, toolName);
    // A real, runnable executable that reports its version and exits 0.
    fs.writeFileSync(exe, `#!/bin/sh\necho "${toolName} ${version}"\n`);
    fs.chmodSync(exe, 0o755);
    return exe;
  }

  // Repoint the stable symlink at a new version, as `brew upgrade` does.
  function pointSymlinkAt(version: string): void {
    const target = path.join(cellarDir, `${toolName}-${version}`, "bin", toolName);
    // rmSync(force) clears the existing link even when it is dangling
    // (fs.existsSync follows the link and reports false for a broken one).
    fs.rmSync(symlinkPath, { force: true });
    fs.symlinkSync(target, symlinkPath);
  }

  async function run(mainCommand: string): Promise<void> {
    // Drives the real backup/runCommand handler, which spawns the executable
    // with { shell: false } exactly like production.
    await Vue.prototype.$util.send("backup/runCommand", {
      command: new Command({ mainCommand, options: [], isSql: false }),
    });
  }

  // Plant a symlink named <toolName> in a directory that is already on the
  // child process's PATH, pointing at the given Cellar target. Returns the
  // symlink path, or null when no writable PATH directory is available.
  //
  // jest's `node` test environment hands spawned children a PATH snapshot that
  // ignores writes to the in-sandbox `process.env`, so the symlink must live on
  // a directory the real child PATH already contains for `which` to find it.
  function plantOnRealPath(target: string): string | null {
    const { spawnSync } = require("child_process");
    const childPath: string = spawnSync("sh", ["-c", "printf %s \"$PATH\""]).stdout.toString();
    const writableDir = childPath
      .split(path.delimiter)
      .filter(Boolean)
      .find((dir) => {
        try {
          return fs.statSync(dir).isDirectory() && (fs.accessSync(dir, fs.constants.W_OK), true);
        } catch {
          return false;
        }
      });
    if (!writableDir) return null;
    const planted = path.join(writableDir, toolName);
    fs.rmSync(planted, { force: true });
    fs.symlinkSync(target, planted);
    return planted;
  }

  beforeAll(() => {
    stub = installUtilStub();

    prefix = fs.mkdtempSync(path.join(os.tmpdir(), "bks-brew-"));
    binDir = path.join(prefix, "bin");
    cellarDir = path.join(prefix, "Cellar");
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(cellarDir, { recursive: true });

    // Install v1.0 and expose it via the stable symlink, like a fresh `brew install`.
    installVersion("1.0");
    symlinkPath = path.join(binDir, toolName);
    pointSymlinkAt("1.0");
  });

  afterAll(async () => {
    // A failed spawn (ENOENT) emits 'error' and then 'close'; let the trailing
    // 'close' drain before disposing the handler state it reads from.
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (plantedOnPath) fs.rmSync(plantedOnPath, { force: true });
    await stub?.dispose();
    fs.rmSync(prefix, { recursive: true, force: true });
  });

  it("auto-discovery (whichDumpTool) returns the stable symlink, not the version-pinned target", async () => {
    // Expose the tool through a symlink on the real PATH, like /opt/homebrew/bin/<tool>.
    plantedOnPath = plantOnRealPath(fs.realpathSync(symlinkPath));
    if (!plantedOnPath) {
      // eslint-disable-next-line no-console
      console.warn("No writable directory on PATH; skipping whichDumpTool discovery assertion.");
      return;
    }

    const discovered: string = await Vue.prototype.$util.send("backup/whichDumpTool", {
      toolName,
    });
    const resolved = fs.realpathSync(plantedOnPath);

    // `which` reports the path as it sits on PATH (the symlink), not the Cellar
    // target — so the auto-discovery site does not introduce the bug.
    expect(discovered).toBe(plantedOnPath);
    expect(discovered).not.toBe(resolved);
    expect(discovered).not.toContain("Cellar");
  });

  it("running via the symlink keeps working across a brew upgrade", async () => {
    // Configure with the stable symlink and confirm it runs.
    await expect(run(symlinkPath)).resolves.toBeUndefined();

    // `brew upgrade`: install 2.0, repoint the symlink, remove the old version.
    installVersion("2.0");
    pointSymlinkAt("2.0");
    fs.rmSync(path.join(cellarDir, `${toolName}-1.0`), { recursive: true, force: true });

    // The symlink still resolves (now to 2.0), so spawning it still works.
    await expect(run(symlinkPath)).resolves.toBeUndefined();
  });

  it("running via the resolved Cellar path (as the file picker persists it) breaks after a brew upgrade", async () => {
    // Reset to a clean v1.0 install for an isolated reproduction.
    fs.rmSync(cellarDir, { recursive: true, force: true });
    fs.mkdirSync(cellarDir, { recursive: true });
    installVersion("1.0");
    pointSymlinkAt("1.0");

    // What Electron's showOpenDialogSync hands back on macOS when the user picks
    // /opt/homebrew/bin/<tool>: the resolved, version-pinned Cellar target. This
    // is the string the app persists in BackupConfig.dumpToolPath today.
    const persistedPath = fs.realpathSync(symlinkPath);
    expect(persistedPath).toContain("Cellar");

    // It runs fine immediately after configuring.
    await expect(run(persistedPath)).resolves.toBeUndefined();

    // `brew upgrade`: 1.0 -> 2.0. The persisted version-pinned path is now gone.
    installVersion("2.0");
    pointSymlinkAt("2.0");
    fs.rmSync(path.join(cellarDir, `${toolName}-1.0`), { recursive: true, force: true });

    // Desired behaviour: the configured tool must still run after an upgrade.
    // Currently FAILS because the stored resolved path no longer exists — this
    // is the bug reported in #4355.
    await expect(run(persistedPath)).resolves.toBeUndefined();
  });
});
