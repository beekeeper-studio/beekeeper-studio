import PluginFileManager from "@/services/plugin/PluginFileManager";
import fs from "fs";
import path from "path";
import { uuidv4 } from "@/lib/uuid";
import { tmpdir } from "os";

const tracker = new Set<PluginFileManager>();

export function createFileManager(): PluginFileManager {
  const manager = new PluginFileManager({
    downloadDirectory: tmpDir(),
    pluginsDirectory: tmpDir(),
  });

  tracker.add(manager);

  return manager;
}

export function cleanFileManager(manager: PluginFileManager) {
  cleanTmpDir(manager.options.downloadDirectory);
  cleanTmpDir(manager.options.pluginsDirectory);
  tracker.delete(manager);
}

export function tmpDir() {
  const randomDir = path.join(tmpdir(), uuidv4());
  fs.mkdirSync(randomDir, { recursive: true });
  return randomDir;
}

export function cleanTmpDir(dir?: string) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
