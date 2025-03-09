import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import { Manifest, PluginRegistryEntry } from "./types";
import platformInfo from '@/common/platform_info';

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
  /** Download all plugin files to `directory` */
  async download(
    entry: PluginRegistryEntry,
    manifest: Manifest,
    options: {
      signal?: AbortSignal;
      /** for update */
      tmp?: boolean;
    } = {}
  ) {
    const directory = this.getDirectoryOf(entry);

    try {
      fs.mkdirSync(directory, { recursive: true });

      const manifestUrl = `https://github.com/${entry.repo}/releases/download/${manifest.version}/manifest.json`;
      log(`Downloading plugin manifest: "${manifestUrl}"...`);
      await download({
        url: manifestUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_MANIFEST_TMP_FILENAME
          : PLUGIN_MANIFEST_FILENAME,
      });

      const scriptUrl = `https://github.com/${entry.repo}/releases/download/${manifest.version}/index.js`;
      log(`Downloading plugin script: "${scriptUrl}"...`);
      await download({
        url: scriptUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_SCRIPT_TMP_FILENAME
          : PLUGIN_SCRIPT_FILENAME,
      });

      const styleUrl = `https://github.com/${entry.repo}/releases/download/${manifest.version}/style.css`;
      log(`Downloading plugin style: "${styleUrl}"...`);
      await download({
        url: styleUrl,
        directory,
        signal: options.signal,
        fileName: options.tmp
          ? PLUGIN_STYLE_TMP_FILENAME
          : PLUGIN_STYLE_FILENAME,
      }).catch((e) => {
        if (e instanceof PluginDownloadError && e.status === "NOT_FOUND") {
          log("Plugin style not found. Skipping.");
          return;
        }
        throw e;
      });
    } catch (e) {
      fs.rmSync(directory, { recursive: true, force: true });
      log("Download failed", e);
      throw e;
    }
  }

  async update(
    entry: PluginRegistryEntry,
    manifest: Manifest,
    options: { signal?: AbortSignal } = {}
  ) {
    await this.download(entry, manifest, { ...options, tmp: true });

    const directory = this.getDirectoryOf(entry);

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

  remove(entry: PluginRegistryEntry) {
    fs.rmSync(this.getDirectoryOf(entry), { recursive: true, force: true });
  }

  scanPlugins(): Manifest[] {
    const manifests: Manifest[] = [];

    for (const dir of fs.readdirSync(platformInfo.pluginsDirectory)) {
      if (!fs.statSync(path.join(platformInfo.pluginsDirectory, dir)).isDirectory()) {
        continue;
      }

      if (
        !fs.existsSync(
          path.join(platformInfo.pluginsDirectory, dir, PLUGIN_MANIFEST_FILENAME)
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

  getDirectoryOf(entry: PluginRegistryEntry) {
    return path.join(platformInfo.pluginsDirectory, entry.id);
  }

  readAsset(manifest: Manifest, filename: string): string {
    const filePath = path.join(platformInfo.pluginsDirectory, manifest.id, path.normalize(filename));
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, { encoding: 'utf-8' });
  }
}
