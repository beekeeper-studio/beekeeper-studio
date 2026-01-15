import PluginFileManager from "@/services/plugin/PluginFileManager";
import fs from "fs";
import path from "path";
import { uuidv4 } from "@/lib/uuid";
import { tmpdir } from "os";
import { Manifest } from "@/services/plugin";
import _ from "lodash";

/**
 * Create a file manager for plugin manager.
 *
 * Usage:
 *
 * ```js
 * import { createFileManager, cleanFileManager } from "./fileManager";
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
export function createFileManager(): PluginFileManager {
  return new PluginFileManager({
    downloadDirectory: tmpDir(),
    pluginsDirectory: tmpDir(),
  });
}

export function preloadPlugins(
  fileManager: PluginFileManager,
  plugins: Partial<Manifest>[]
) {
  fileManager.scanPlugins = () =>
    plugins.map((plugin) => createTestManifest(plugin));
}

let counter = 0;

function createTestManifest(manifest?: Partial<Manifest>): Manifest {
  const defaultManifest: Manifest = {
    id: uuidv4(),
    name: `Test Plugin ${counter++}`,
    version: "1.0.0",
    manifestVersion: 1,
    capabilities: {
      views: [],
      menu: [],
    },
    author: "Beekeeper Studio",
    description: "Test plugin for testing purposes",
  }
  return _.merge(defaultManifest, manifest);
}


/** Erase plugins data. */
export function cleanFileManager(manager: PluginFileManager) {
  manager.scanPlugins = PluginFileManager.prototype.scanPlugins.bind(manager);
  cleanTmpDir(manager.options.downloadDirectory);
  cleanTmpDir(manager.options.pluginsDirectory);
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
