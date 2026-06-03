/*
 * Regression coverage for issue #4355:
 *   "BUG: Beekeeper does not follow symlinks (e.g. for az-cli)"
 *   https://github.com/beekeeper-studio/beekeeper-studio/issues/4355
 *
 * Homebrew exposes a stable symlink (e.g. /opt/homebrew/bin/az) that always
 * points at the currently-installed version under the Cellar
 * (e.g. /opt/homebrew/Cellar/azure-cli/2.85.0/bin/az). Two things were wrong:
 *
 *   - Auto-discovery never found Homebrew tools, because a macOS GUI app's PATH
 *     doesn't include /opt/homebrew/bin or /usr/local/bin.
 *   - The native file picker resolved a chosen symlink to its version-pinned
 *     Cellar target, so after `brew upgrade` the stored path vanished.
 *
 * The fix:
 *   A. The executable picker passes `noResolveAliases` so macOS returns the
 *      symlink, not the Cellar target (verified manually on macOS — the native
 *      dialog can't run under jest).
 *   B. whichDumpTool prepends the Homebrew bin dirs to the lookup PATH on macOS
 *      (extraToolSearchDirs), so brew tools are discovered via their stable
 *      symlink. Covered here against the REAL filesystem, with NO mocks.
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
  let binDir: string; // <prefix>/bin   (stable, prepended to PATH)
  let cellarDir: string; // <prefix>/Cellar (versioned)
  let symlinkPath: string; // <prefix>/bin/<tool>  -> Cellar/<tool>-<ver>/bin/<tool>
  let originalPath: string | undefined;

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

    // Stand in for /opt/homebrew/bin being on PATH. whichDumpTool now forwards
    // the environment to the `which` child explicitly, so this is honoured.
    originalPath = process.env.PATH;
    process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ""}`;
  });

  afterAll(async () => {
    // A failed spawn (ENOENT) emits 'error' and then 'close'; let the trailing
    // 'close' drain before disposing the handler state it reads from.
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    await stub?.dispose();
    fs.rmSync(prefix, { recursive: true, force: true });
  });

  it("auto-discovery (whichDumpTool) returns the stable symlink, not the version-pinned target", async () => {
    const discovered: string = await Vue.prototype.$util.send("backup/whichDumpTool", {
      toolName,
    });

    // `which` reports the path as it sits on PATH (the symlink), not the Cellar
    // target — so what we persist keeps working after `brew upgrade`.
    expect(discovered).toBe(symlinkPath);
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

  it("a version-pinned Cellar path (the pre-fix picker behaviour) is what breaks after a brew upgrade", async () => {
    // Reset to a clean v1.0 install for an isolated reproduction.
    fs.rmSync(cellarDir, { recursive: true, force: true });
    fs.mkdirSync(cellarDir, { recursive: true });
    installVersion("1.0");
    pointSymlinkAt("1.0");

    // The resolved, version-pinned Cellar target — what macOS used to hand back
    // before fix A added noResolveAliases. It runs fine immediately after configuring.
    const resolvedPath = fs.realpathSync(symlinkPath);
    expect(resolvedPath).toContain("Cellar");
    await expect(run(resolvedPath)).resolves.toBeUndefined();

    // `brew upgrade`: 1.0 -> 2.0. The version-pinned path is now gone, demonstrating
    // why the picker must keep the symlink (fix A) and discovery must find it (fix B).
    installVersion("2.0");
    pointSymlinkAt("2.0");
    fs.rmSync(path.join(cellarDir, `${toolName}-1.0`), { recursive: true, force: true });

    expect(fs.existsSync(resolvedPath)).toBe(false);
    await expect(run(resolvedPath)).rejects.toMatch(/ENOENT/);
  });
});
