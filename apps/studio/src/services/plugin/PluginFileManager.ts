import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import { Manifest, PluginView, Release } from "./types";
import extract from "extract-zip";
import { tmpdir } from "os";

export type PluginFileManagerOptions = {
  downloadDirectory?: string;
  pluginsDirectory: string;
}

const log = rawLog.scope("PluginFileManager");

const PLUGIN_MANIFEST_FILENAME = "manifest.json";

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

  /**
   * Copy `sourceDir` to app's `pluginsDirectory`. It assumes that the source
   * directory is a plugin directory with valid file structure.
   *
   * If the plugin is already installed, it will be replaced.
   *
   * @param pluginId Plugin ID
   * @param sourceDir Source directory to the plugin
   **/
  install(
    pluginId: string,
    sourceDir: string,
    options?: { removeSourceDir?: boolean; }
  ) {
    const directory = this.getDirectoryOf(pluginId);
    const oldPlugin = this.getDirectoryOf(`${pluginId}-tmp-${Date.now()}`);

    try {
      if (fs.existsSync(directory)) {
        fs.renameSync(directory, oldPlugin);
      }
    } catch (e) {
      log.error(`Failed to rename plugin directory ${directory} -> ${oldPlugin}`, e);
      throw e;
    }

    try {
      fs.cpSync(sourceDir, directory, { recursive: true });
    } catch (e) {
      // Ressurect the old plugin if the copy failed
      fs.renameSync(oldPlugin, directory);
      log.error(`Failed to copy plugin directory ${sourceDir} -> ${directory}`, e);
      throw e;
    }

    fs.rmSync(oldPlugin, { recursive: true, force: true });

    if (options.removeSourceDir) {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  }

  /**
   * Download plugin source archive to a temporary directory and extract it.
   * @param pluginId Plugin ID
   * @param release Release metadata containing the archive URL and manifest
   * @param options Download options
   * @param options.signal Optional AbortSignal to cancel the download
   * @returns Path to the temporary directory containing the extracted files
   */
  async download(
    pluginId: string,
    release: Release,
    options: {
      signal?: AbortSignal;
    } = {}
  ): Promise<string> {
    const tmpDirectory = path.join(tmpdir(), `beekeeper-plugin-${pluginId}-${Date.now()}`);

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
      return tmpDirectory;
    } catch (e) {
      // Clean up on error
      fs.rmSync(tmpDirectory, { recursive: true, force: true });
      log.debug("Download failed", e);
      throw e;
    }
  }

  uninstall(id: string) {
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
        manifests.push(manifest);
      } catch (e) {
        log.error(`Failed to parse manifest for plugin "${dir}":`, e);
      }
    }

    return manifests;
  }

  /**
   * Read and parse the manifest file for a plugin.
   * @param id Plugin ID
   * @param sourceDir Optional alternative directory path to read the manifest from,
   *                  instead of the default plugins directory. Useful for reading
   *                  manifests from temporary or staging directories (e.g. after download
   *                  but before installation).
   */
  getManifest(id: string, sourceDir?: string) {
    const directory = sourceDir || this.getDirectoryOf(id);
    const manifestContent = fs.readFileSync(
      path.join(directory, PLUGIN_MANIFEST_FILENAME),
      { encoding: "utf-8" }
    );
    return JSON.parse(manifestContent);
  }

  getDirectoryOf(id: string) {
    return path.join(this.options.pluginsDirectory, id);
  }

  private getPath(manifest: Manifest, filename: string): string {
    return path.join(
      this.options.pluginsDirectory,
      manifest.id,
      path.normalize(filename)
    );
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
