import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import { Manifest, PluginView, Release } from "./types";
import { PluginError } from "@/lib/errors";
import extract from "extract-zip";
import { tmpdir } from "os";

export type PluginFileManagerOptions = {
  downloadDirectory?: string;
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

class PluginDownloadError extends Error {
  status: "UNKNOWN" | "NOT_FOUND" | "ABORTED" = "UNKNOWN";

  constructor(message: string, public originalError?: Error) {
    super(message);

    this.name = "PluginDownloadError";
    this.originalError = originalError;

    if (originalError) {
      if (originalError && originalError.stack) {
        this.stack += "\nCaused by: " + originalError.stack;
      }
      if (originalError.statusCode === 404) {
        this.status = "NOT_FOUND";
      }
    }
  }
}

async function download(options: DownloaderConfig & { signal?: AbortSignal }) {
  let downloadStatus: "COMPLETE" | "ABORTED";
  let report: DownloaderReport;

  try {
    const downloader = new Downloader(options);
    options.signal?.addEventListener("abort", downloader.cancel);
    report = await downloader.download().finally(() => {
      options.signal?.removeEventListener("abort", downloader.cancel);
    });
    downloadStatus = report.downloadStatus;
  } catch (e) {
    if (e.responseBody) {
      throw new PluginDownloadError(e.responseBody, e);
    }
    throw new PluginDownloadError("Download failed", e);
  }

  if (downloadStatus === "ABORTED") {
    const error = new PluginDownloadError("Download aborted");
    error.status = "ABORTED";
    throw error;
  }

  return report.filePath;
}

/**
 * Extract the archive file based on the platform
 * @param archivePath Path to the archive file
 * @param extractDir Directory to extract to
 */
async function extractArchive(
  archivePath: string,
  extractDir: string
): Promise<void> {
  try {
    await extract(archivePath, { dir: extractDir });
  } catch (error) {
    log.error(`Error extracting archive: ${error.message}`);
    throw new Error(`Failed to extract plugin archive: ${error.message}`);
  }
}

export default class PluginFileManager {
  constructor(readonly options: PluginFileManagerOptions) {}

  /** Download plugin source archive to `directory` and extract it */
  async download(
    pluginId: string,
    release: Release,
    options: {
      signal?: AbortSignal;
      /** for update */
      tmp?: boolean;
    } = {}
  ) {
    const directory = this.getDirectoryOf(pluginId);
    const mustCleanup = !this.options?.downloadDirectory;
    const tmpDirectory =
      this.options?.downloadDirectory ||
      path.join(tmpdir(), `beekeeper-plugin-${pluginId}-${Date.now()}`);

    try {
      // Create temp directory for initial download
      fs.mkdirSync(tmpDirectory, { recursive: true });

      log.debug(
        `Downloading plugin "${pluginId}" version "${release.manifest.version}"...`
      );

      // Download the source archive
      log.debug(
        `Downloading plugin source archive: "${release.sourceArchiveUrl}"...`
      );
      const archivePath = await download({
        url: release.sourceArchiveUrl,
        directory: tmpDirectory,
        signal: options.signal,
        fileName: `${pluginId}-${release.manifest.version}-${Date.now()}-tmp.zip`,
        headers: {
          "User-Agent": "Beekeeper Studio",
        },
      });

      // Extract the archive to the temp directory
      log.debug(`Extracting plugin archive...`);
      await extractArchive(archivePath, tmpDirectory);

      // If we're updating, keep in temp directory
      if (options.tmp) {
        return tmpDirectory;
      }

      // Create final directory
      fs.mkdirSync(directory, { recursive: true });

      // Copy extracted files to final directory
      // First remove the archive file to not copy it
      fs.unlinkSync(archivePath);

      // Copy all files from temp to final directory
      this.copyDirectory(tmpDirectory, directory);

      // Clean up temp directory
      if (mustCleanup) {
        fs.rmSync(tmpDirectory, { recursive: true, force: true });
      }
    } catch (e) {
      // Clean up on error
      if (mustCleanup) {
        fs.rmSync(tmpDirectory, { recursive: true, force: true });
      }
      if (!options.tmp) {
        fs.rmSync(directory, { recursive: true, force: true });
      }
      log.debug("Download failed", e);
      throw e;
    }
  }

  /**
   * Copy all files from source to destination directory
   */
  private copyDirectory(source: string, destination: string) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    // Read the source directory
    const files = fs.readdirSync(source);

    // Copy each file/directory
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);

      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        // Recursively copy directories
        this.copyDirectory(sourcePath, destPath);
      } else {
        // Copy files
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  async update(
    pluginId: string,
    release: Release,
    options: { signal?: AbortSignal } = {}
  ) {
    // Download to temp location
    const tmpDirectory = await this.download(pluginId, release, {
      ...options,
      tmp: true,
    });
    const finalDirectory = this.getDirectoryOf(pluginId);

    try {
      // Remove existing plugin directory
      fs.rmSync(finalDirectory, { recursive: true, force: true });

      // Create final directory
      fs.mkdirSync(finalDirectory, { recursive: true });

      // Copy all files from temp to final directory
      this.copyDirectory(tmpDirectory, finalDirectory);

      // Clean up temp directory
      fs.rmSync(tmpDirectory, { recursive: true, force: true });
    } catch (e) {
      // Clean up on error
      fs.rmSync(tmpDirectory, { recursive: true, force: true });
      log.debug("Update failed", e);
      throw e;
    }
  }

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
