import ExtensionFileManager from "@/services/extension/ExtensionFileManager";
import { Manifest } from "@/services/plugin/types";
import fs from "fs";
import path from "path";
import { uuidv4 } from "@/lib/uuid";
import { tmpdir } from "os";

/**
 * Create a file manager for plugin manager.
 *
 * Usage:
 *
 * ```js
 * import { createFileManager, cleanFileManager } from "./extensionFileManager";
 *
 * it("can do it", async () => {
 *   const fileManager = createFileManager();
 *
 *   const manager = new PluginManager({ fileManager });
 *   await manager.initialize();
 *
 *   // tests here ...
 *
 *   cleanFileManager(fileManager);
 * })
 * ```
 */
export function createFileManager(): ExtensionFileManager<Manifest> {
  return new ExtensionFileManager({
    downloadDirectory: tmpDir(),
    root: tmpDir(),
  });
}

/** Erase plugins data. */
export function cleanFileManager(manager: ExtensionFileManager<Manifest>) {
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
