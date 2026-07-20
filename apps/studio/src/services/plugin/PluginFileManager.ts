import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import { Manifest, PluginView } from "./types";
import { PluginError } from "@/lib/errors";

export type PluginFileManagerOptions = {
  pluginsDirectory: string;
}

const log = rawLog.scope("PluginFileManager");

const PLUGIN_MANIFEST_FILENAME = "manifest.json";

/**
 * A plugin id is used verbatim as a single directory-name segment under the
 * plugins directory (see `getDirectoryOf`) and as an identity key. It is read
 * from attacker-controlled `manifest.json`, so it must be constrained to a
 * single safe path component: alphanumeric first character, then alphanumerics
 * plus `.` `_` `-`. This forbids path separators and `.`/`..`, which are the
 * only traversal-capable strings once separators are excluded.
 */
const PLUGIN_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/** Max length mirrors the npm package-name limit; ample for any real plugin. */
const PLUGIN_ID_MAX_LENGTH = 214;

export function isValidPluginId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length <= PLUGIN_ID_MAX_LENGTH &&
    PLUGIN_ID_PATTERN.test(id)
  );
}

export default class PluginFileManager {
  constructor(readonly options: PluginFileManagerOptions) {}

  remove(id: string) {
    fs.rmSync(this.getDirectoryOf(id), { recursive: true, force: true });
  }

  scanPlugins(): Manifest[] {
    const manifests: Manifest[] = [];

    if (!fs.existsSync(this.options.pluginsDirectory)) {
      fs.mkdirSync(this.options.pluginsDirectory, { recursive: true });
    }

    for (const dir of fs.readdirSync(this.options.pluginsDirectory)) {
      if (
        !fs
          .statSync(path.join(this.options.pluginsDirectory, dir))
          .isDirectory()
      ) {
        continue;
      }

      const manifestPath = path.join(
        this.options.pluginsDirectory,
        dir,
        PLUGIN_MANIFEST_FILENAME
      );

      if (!fs.existsSync(manifestPath)) {
        log.warn(`Found folder without manifest: ${dir}. Skipping.`);
        continue;
      }

      const manifestContent = fs.readFileSync(manifestPath, {
        encoding: "utf-8",
      });

      try {
        const manifest = JSON.parse(manifestContent);
        this.validateManifest(manifest, dir);
        manifests.push(manifest);
      } catch (e) {
        log.error(`Failed to parse manifest for plugin "${dir}":`, e);
      }
    }

    return manifests;
  }

  getManifest(id: string) {
    const directory = this.getDirectoryOf(id);
    const manifestContent = fs.readFileSync(
      path.join(directory, PLUGIN_MANIFEST_FILENAME),
      { encoding: "utf-8" }
    );
    const manifest = JSON.parse(manifestContent);
    this.validateManifest(manifest, id);
    return manifest;
  }

  /**
   * Ensure a manifest's self-declared id is safe to reuse. The id is later used
   * as a path segment (uninstall/update) and as an identity key, so it must be
   * well-formed and match the directory it was installed into. Trusting the
   * directory name over the self-declared id stops a plugin from redirecting
   * filesystem operations at another location.
   */
  private validateManifest(manifest: Manifest, expectedId: string) {
    if (!isValidPluginId(manifest.id)) {
      throw new PluginError(
        "MANIFEST_PARSE",
        `Plugin "${expectedId}" has a missing or invalid manifest id.`
      );
    }
    if (manifest.id !== expectedId) {
      throw new PluginError(
        "MANIFEST_PARSE",
        `Plugin manifest id "${manifest.id}" does not match expected id "${expectedId}".`
      );
    }
  }

  getDirectoryOf(id: string) {
    const pluginsRoot = path.resolve(this.options.pluginsDirectory);
    const resolved = path.resolve(pluginsRoot, id);
    // Must be strictly *inside* the plugins directory. This rejects traversal
    // (`../`), absolute ids, and the empty/`.` id (which would resolve to the
    // plugins root itself and let `remove()` delete every installed plugin).
    if (!resolved.startsWith(pluginsRoot + path.sep)) {
      throw new Error(
        `Refusing to access path outside plugins directory: ${id}`
      );
    }
    return resolved;
  }

  private getPath(manifest: Manifest, filename: string): string {
    const pluginRoot = path.resolve(
      this.options.pluginsDirectory,
      manifest.id
    );
    const resolved = path.resolve(pluginRoot, filename);
    if (
      resolved !== pluginRoot &&
      !resolved.startsWith(pluginRoot + path.sep)
    ) {
      throw new Error(
        `Refusing to access path outside plugin directory: ${filename}`
      );
    }
    return resolved;
  }

  readAsset(manifest: Manifest, filename: string): string {
    const filePath = this.getPath(manifest, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  }

  /** Check if view's entrypoint exists */
  viewEntrypointExists(manifest: Manifest, view: PluginView): boolean {
    return fs.existsSync(this.getPath(manifest, view.entry));
  }
}
