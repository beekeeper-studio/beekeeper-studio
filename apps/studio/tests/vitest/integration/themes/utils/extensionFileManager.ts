import ExtensionFileManager from "@/services/extensions/ExtensionFileManager";
import { ThemeManifest } from "@/services/plugin/types";
import fs from "fs";
import path from "path";
import { uuidv4 } from "@/lib/uuid";
import { tmpdir } from "os";

/**
 * Create a file manager for theme manager.
 *
 * Usage:
 *
 * ```js
 * import { createFileManager, cleanFileManager } from "./extensionFileManager";
 *
 * it("can do it", async () => {
 *   const fileManager = createFileManager();
 *
 *   const manager = new ThemeManager({ fileManager });
 *   await manager.initialize();
 *
 *   // tests here ...
 *
 *   cleanFileManager(fileManager);
 * })
 * ```
 */
export function createFileManager(): ExtensionFileManager<ThemeManifest> {
  return new ExtensionFileManager({
    downloadDirectory: tmpDir(),
    root: tmpDir(),
  });
}

/** Erase themes data. */
export function cleanFileManager(manager: ExtensionFileManager<ThemeManifest>) {
  cleanTmpDir(manager.options.downloadDirectory);
  cleanTmpDir(manager.options.root);
}

function tmpDir() {
  const randomDir = path.join(tmpdir(), uuidv4());
  fs.mkdirSync(randomDir, { recursive: true });
  return randomDir;
}

function cleanTmpDir(dir?: string) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
