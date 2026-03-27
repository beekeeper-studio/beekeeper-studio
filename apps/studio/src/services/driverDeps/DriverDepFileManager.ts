import rawLog from "@bksLogger";
import fs from "fs";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import extract from "extract-zip";
import { tmpdir } from "os";
import {
  DriverDepArtifact,
  InstalledDriverDep,
  DownloadProgress,
} from "./types";

const log = rawLog.scope("DriverDepFileManager");

const MANIFEST_FILENAME = "manifest.json";

class DriverDepDownloadError extends Error {
  status: "UNKNOWN" | "NOT_FOUND" | "ABORTED" = "UNKNOWN";

  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = "DriverDepDownloadError";
    if (originalError?.stack) {
      this.stack += "\nCaused by: " + originalError.stack;
    }
    if ((originalError as any)?.statusCode === 404) {
      this.status = "NOT_FOUND";
    }
  }
}

async function downloadFile(
  options: DownloaderConfig & {
    signal?: AbortSignal;
    onProgress?: (percentage: number, chunk: number, remaining: number) => void;
  }
): Promise<string> {
  let report: DownloaderReport;

  try {
    const downloader = new Downloader({
      ...options,
      onProgress: options.onProgress,
    });
    options.signal?.addEventListener("abort", downloader.cancel);
    report = await downloader.download().finally(() => {
      options.signal?.removeEventListener("abort", downloader.cancel);
    });
  } catch (e) {
    if (options.signal?.aborted) {
      const error = new DriverDepDownloadError("Download aborted");
      error.status = "ABORTED";
      throw error;
    }
    if (e.responseBody) {
      throw new DriverDepDownloadError(e.responseBody, e);
    }
    throw new DriverDepDownloadError("Download failed", e);
  }

  if (report.downloadStatus === "ABORTED") {
    const error = new DriverDepDownloadError("Download aborted");
    error.status = "ABORTED";
    throw error;
  }

  return report.filePath;
}

export interface DriverDepFileManagerOptions {
  driverDepsDirectory: string;
  userAgent: string;
}

export default class DriverDepFileManager {
  constructor(readonly options: DriverDepFileManagerOptions) {}

  /**
   * Download and install a driver dependency.
   * Returns the path to the installed directory (the usable library root).
   */
  async install(
    requirementId: string,
    artifact: DriverDepArtifact,
    extractedDirName: string | undefined,
    version: string,
    callbacks?: {
      signal?: AbortSignal;
      onProgress?: (progress: DownloadProgress) => void;
    }
  ): Promise<string> {
    const finalDirectory = this.getDirectoryOf(requirementId);
    const tmpDirectory = path.join(
      tmpdir(),
      `beekeeper-driver-dep-${requirementId}-${Date.now()}`
    );

    try {
      fs.mkdirSync(tmpDirectory, { recursive: true });

      log.debug(
        `Downloading driver dep "${requirementId}" from "${artifact.url}"...`
      );
      callbacks?.onProgress?.({ phase: "downloading", percentage: 0 });

      const archivePath = await downloadFile({
        url: artifact.url,
        directory: tmpDirectory,
        signal: callbacks?.signal,
        fileName: artifact.fileName,
        headers: { "User-Agent": this.options.userAgent },
        onProgress(percentage) {
          callbacks?.onProgress?.({
            phase: "downloading",
            percentage: Math.round(Number(percentage)),
          });
        },
      });

      log.debug(`Extracting driver dep archive...`);
      callbacks?.onProgress?.({ phase: "extracting" });

      await extract(archivePath, { dir: tmpDirectory });

      // Determine the usable directory inside the extracted contents
      const usableDir = this.resolveExtractedDir(
        tmpDirectory,
        extractedDirName
      );

      log.debug(`Installing to "${finalDirectory}"...`);
      callbacks?.onProgress?.({ phase: "installing" });

      // Remove previous install if any
      if (fs.existsSync(finalDirectory)) {
        fs.rmSync(finalDirectory, { recursive: true, force: true });
      }
      fs.mkdirSync(finalDirectory, { recursive: true });

      // Copy the usable directory contents to the final location
      this.copyDirectory(usableDir, finalDirectory);

      // Write manifest
      const manifest: InstalledDriverDep = {
        requirementId,
        version,
        installedPath: finalDirectory,
        installedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(finalDirectory, MANIFEST_FILENAME),
        JSON.stringify(manifest, null, 2)
      );

      // Clean up temp
      fs.rmSync(tmpDirectory, { recursive: true, force: true });

      callbacks?.onProgress?.({ phase: "complete", percentage: 100 });
      log.debug(`Driver dep "${requirementId}" installed to "${finalDirectory}"`);

      return finalDirectory;
    } catch (e) {
      fs.rmSync(tmpDirectory, { recursive: true, force: true });
      log.error(`Failed to install driver dep "${requirementId}":`, e);
      throw e;
    }
  }

  /**
   * After extraction, find the actual library directory.
   * If extractedDirName is specified and exists, use it.
   * Otherwise, use the first top-level directory found.
   */
  private resolveExtractedDir(
    extractRoot: string,
    extractedDirName?: string
  ): string {
    if (extractedDirName) {
      const specified = path.join(extractRoot, extractedDirName);
      if (fs.existsSync(specified) && fs.statSync(specified).isDirectory()) {
        return specified;
      }
      log.warn(
        `Expected directory "${extractedDirName}" not found, auto-detecting...`
      );
    }

    // Auto-detect: find the first top-level directory (skip files like the archive itself)
    const entries = fs.readdirSync(extractRoot);
    for (const entry of entries) {
      const fullPath = path.join(extractRoot, entry);
      if (
        fs.statSync(fullPath).isDirectory() &&
        entry.startsWith("instantclient")
      ) {
        log.debug(`Auto-detected extracted directory: "${entry}"`);
        return fullPath;
      }
    }

    // Fallback: first directory
    for (const entry of entries) {
      const fullPath = path.join(extractRoot, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        log.debug(`Using first directory as fallback: "${entry}"`);
        return fullPath;
      }
    }

    // No directory found — use the extract root itself
    log.warn("No subdirectory found after extraction, using extract root");
    return extractRoot;
  }

  remove(requirementId: string): void {
    const dir = this.getDirectoryOf(requirementId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log.debug(`Removed driver dep "${requirementId}"`);
    }
  }

  scanInstalled(): InstalledDriverDep[] {
    const results: InstalledDriverDep[] = [];
    const baseDir = this.options.driverDepsDirectory;

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      return results;
    }

    for (const dir of fs.readdirSync(baseDir)) {
      const fullPath = path.join(baseDir, dir);
      if (!fs.statSync(fullPath).isDirectory()) continue;

      const manifestPath = path.join(fullPath, MANIFEST_FILENAME);
      if (!fs.existsSync(manifestPath)) {
        log.warn(`Driver dep directory "${dir}" has no manifest, skipping`);
        continue;
      }

      try {
        const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
        results.push(JSON.parse(content));
      } catch (e) {
        log.error(`Failed to parse manifest for driver dep "${dir}":`, e);
      }
    }

    return results;
  }

  getManifest(requirementId: string): InstalledDriverDep | null {
    const manifestPath = path.join(
      this.getDirectoryOf(requirementId),
      MANIFEST_FILENAME
    );
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  getDirectoryOf(requirementId: string): string {
    return path.join(this.options.driverDepsDirectory, requirementId);
  }

  private copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    for (const file of fs.readdirSync(source)) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }
}
