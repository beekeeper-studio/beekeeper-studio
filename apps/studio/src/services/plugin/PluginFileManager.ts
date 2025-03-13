import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import { Manifest, PluginRegistryEntry, Release } from "./types";
import platformInfo from "@/common/platform_info";
import PluginRepositoryService from "./PluginRepositoryService";

const log = rawLog.scope("PluginFileManager");

const PLUGIN_MANIFEST_FILENAME = "manifest.json";
const PLUGIN_SCRIPT_FILENAME = "index.js";
const PLUGIN_STYLE_FILENAME = "style.css";
const PLUGIN_MANIFEST_TMP_FILENAME = "manifest.json.tmp";
const PLUGIN_SCRIPT_TMP_FILENAME = "index.js.tmp";
const PLUGIN_STYLE_TMP_FILENAME = "style.css.tmp";

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

export default class PluginFileManager {
  constructor(private readonly repositoryService: PluginRepositoryService) {}

  /** Download all plugin files to `directory` */
  async download(
    entry: PluginRegistryEntry,
    release: Release,
    options: {
      signal?: AbortSignal;
      /** for update */
      tmp?: boolean;
    } = {}
  ) {
    const directory = this.getDirectoryOf(entry.id);

    try {
      fs.mkdirSync(directory, { recursive: true });

      log.debug(
        `Downloading plugin "${entry.id}" version "${release.version}"...`
      );

      log.debug(
        `Downloading plugin manifest: "${release.manifestDownloadUrl}"...`
      );
      await download({
        url: release.manifestDownloadUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_MANIFEST_TMP_FILENAME
          : PLUGIN_MANIFEST_FILENAME,
      });

      log.debug(`Downloading plugin script: "${release.scriptDownloadUrl}"...`);
      await download({
        url: release.scriptDownloadUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_SCRIPT_TMP_FILENAME
          : PLUGIN_SCRIPT_FILENAME,
      });

      log.debug(`Downloading plugin style: "${release.styleDownloadUrl}"...`);
      await download({
        url: release.styleDownloadUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_STYLE_TMP_FILENAME
          : PLUGIN_STYLE_FILENAME,
      }).catch((e) => {
        if (e instanceof PluginDownloadError && e.status === "NOT_FOUND") {
          log.debug("Plugin style not found. Skipping.");
          return;
        }
        throw e;
      });
    } catch (e) {
      fs.rmSync(directory, { recursive: true, force: true });
      log.debug("Download failed", e);
      throw e;
    }
  }

  async update(
    entry: PluginRegistryEntry,
    release: Release,
    options: { signal?: AbortSignal } = {}
  ) {
    await this.download(entry, release, { ...options, tmp: true });

    const directory = this.getDirectoryOf(entry.id);

    // Rename old files
    fs.rmSync(path.join(directory, PLUGIN_MANIFEST_FILENAME), { force: true });
    fs.rmSync(path.join(directory, PLUGIN_SCRIPT_FILENAME), { force: true });
    fs.rmSync(path.join(directory, PLUGIN_STYLE_FILENAME), { force: true });

    // Rename new files
    fs.renameSync(
      path.join(directory, PLUGIN_MANIFEST_TMP_FILENAME),
      path.join(directory, PLUGIN_MANIFEST_FILENAME)
    );
    fs.renameSync(
      path.join(directory, PLUGIN_SCRIPT_TMP_FILENAME),
      path.join(directory, PLUGIN_SCRIPT_FILENAME)
    );
    fs.renameSync(
      path.join(directory, PLUGIN_STYLE_TMP_FILENAME),
      path.join(directory, PLUGIN_STYLE_FILENAME)
    );

    // Remove temp directory
    fs.rmSync(path.join(directory, "tmp"), { recursive: true, force: true });
  }

  remove(manifest: Manifest) {
    fs.rmSync(this.getDirectoryOf(manifest), { recursive: true, force: true });
  }

  scanPlugins(): Manifest[] {
    const manifests: Manifest[] = [];

    for (const dir of fs.readdirSync(platformInfo.pluginsDirectory)) {
      if (
        !fs
          .statSync(path.join(platformInfo.pluginsDirectory, dir))
          .isDirectory()
      ) {
        continue;
      }

      if (
        !fs.existsSync(
          path.join(
            platformInfo.pluginsDirectory,
            dir,
            PLUGIN_MANIFEST_FILENAME
          )
        ) ||
        !fs.existsSync(
          path.join(platformInfo.pluginsDirectory, dir, PLUGIN_SCRIPT_FILENAME)
        )
      ) {
        log.warn(`Found folder without manifest or script: ${dir}. Skipping.`);
        continue;
      }

      const manifestContent = fs.readFileSync(
        path.join(platformInfo.pluginsDirectory, dir, PLUGIN_MANIFEST_FILENAME),
        { encoding: "utf-8" }
      );

      try {
        manifests.push(JSON.parse(manifestContent));
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
    return JSON.parse(manifestContent);
  }

  getDirectoryOf(manifestOrId: Manifest | Manifest["id"]) {
    return path.join(
      platformInfo.pluginsDirectory,
      typeof manifestOrId === "string" ? manifestOrId : manifestOrId.id
    );
  }

  readAsset(manifest: Manifest, filename: string): string {
    const filePath = path.join(
      platformInfo.pluginsDirectory,
      manifest.id,
      path.normalize(filename)
    );
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  }
}
