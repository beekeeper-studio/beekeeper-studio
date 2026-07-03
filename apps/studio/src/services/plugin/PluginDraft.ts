import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import extract from "extract-zip";
import { Release } from "./types";

const log = rawLog.scope("PluginDraft");

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

async function downloadFile(
  options: DownloaderConfig & { signal?: AbortSignal }
) {
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

function copyDirectory(source: string, destination: string) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  for (const file of fs.readdirSync(source)) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

export class PluginDraft {
  private staged?: string;

  constructor(private readonly release: Release) {}

  get id(): string {
    return this.release.manifest.id;
  }

  get sourceDir(): string {
    if (!this.staged) {
      throw new Error(`Plugin "${this.id}" has not been staged yet.`);
    }
    return this.staged;
  }

  async stage(options: { signal?: AbortSignal } = {}): Promise<PluginDraft> {
    const sourceDir = path.join(
      tmpdir(),
      `beekeeper-plugin-${this.id}-${Date.now()}`
    );
    const version = this.release.manifest.version;

    try {
      fs.mkdirSync(sourceDir, { recursive: true });

      log.debug(`Downloading plugin "${this.id}" version "${version}"...`);
      const archivePath = await downloadFile({
        url: this.release.sourceArchiveUrl,
        directory: sourceDir,
        signal: options.signal,
        fileName: `${this.id}-${version}-${Date.now()}-tmp.zip`,
        headers: {
          "User-Agent": "Beekeeper Studio",
        },
      });

      log.debug(`Extracting plugin archive...`);
      await extractArchive(archivePath, sourceDir);

      // exclude the archive from the plugin's files
      fs.unlinkSync(archivePath);

      this.staged = sourceDir;
      return this;
    } catch (e) {
      fs.rmSync(sourceDir, { recursive: true, force: true });
      log.debug("Download failed", e);
      throw e;
    }
  }

  async install(targetDir: string): Promise<void> {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });
    copyDirectory(this.sourceDir, targetDir);
  }

  async clean(): Promise<void> {
    if (this.staged) {
      fs.rmSync(this.staged, { recursive: true, force: true });
    }
  }
}
