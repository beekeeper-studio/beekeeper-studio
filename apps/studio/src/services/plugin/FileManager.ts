import rawLog from "@bksLogger";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import {
  Downloader,
  DownloaderConfig,
  DownloaderReport,
} from "nodejs-file-downloader";
import { BaseManifest, Release } from "./types";
import { isValidManifestId } from "./utils";
import { ChecksumMismatchError, ManifestError, PathTraversalError } from "@/lib/errors";
import extract from "extract-zip";
import { tmpdir } from "os";

export type FileManagerOptions = {
  downloadDirectory?: string;
  root: string;
}

const log = rawLog.scope("FileManager");

const MANIFEST_FILENAME = "manifest.json";

class DownloadError extends Error {
  status: "UNKNOWN" | "NOT_FOUND" | "ABORTED" = "UNKNOWN";

  constructor(message: string, public originalError?: Error) {
    super(message);

    this.name = "DownloadError";
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
      throw new DownloadError(e.responseBody, e);
    }
    throw new DownloadError("Download failed", e);
  }

  if (downloadStatus === "ABORTED") {
    const error = new DownloadError("Download aborted");
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
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

export default class FileManager<Manifest extends BaseManifest> {
  constructor(readonly options: FileManagerOptions) {}

  /** Download source archive to `directory` and extract it */
  async download(
    id: string,
    release: Release<Manifest>,
    options: {
      signal?: AbortSignal;
      /** for update */
      tmp?: boolean;
    } = {}
  ) {
    const directory = this.getDirectoryOf(id);
    const mustCleanup = !this.options?.downloadDirectory;
    const tmpDirectory =
      this.options?.downloadDirectory ||
      path.join(tmpdir(), `beekeeper-studio-${id}-${Date.now()}`);

    try {
      // Create temp directory for initial download
      fs.mkdirSync(tmpDirectory, { recursive: true });

      log.debug(
        `Downloading "${id}" version "${release.manifest.version}"...`
      );

      // Download the source archive
      log.debug(
        `Downloading source archive: "${release.sourceArchiveUrl}"...`
      );
      const archivePath = await download({
        url: release.sourceArchiveUrl,
        directory: tmpDirectory,
        signal: options.signal,
        fileName: `${id}-${release.manifest.version}-${Date.now()}-tmp.zip`,
        headers: {
          "User-Agent": "Beekeeper Studio",
        },
      });

      const checksum = await this.hashFile(archivePath);

      log.debug(`Checking ${archivePath} against checksum ${release.checksum}`);
      if (release.checksum && checksum !== release.checksum) {
        throw new ChecksumMismatchError("Checksum mismatch, blocking install.");
      }

      // Extract the archive to the temp directory
      log.debug(`Extracting archive...`);
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
    id: string,
    release: Release<Manifest>,
    options: { signal?: AbortSignal } = {}
  ) {
    // Download to temp location
    const tmpDirectory = await this.download(id, release, {
      ...options,
      tmp: true,
    });
    const finalDirectory = this.getDirectoryOf(id);

    try {
      // Remove existing directory
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

  scan(): Manifest[] {
    const manifests: Manifest[] = [];

    if (!fs.existsSync(this.options.root)) {
      fs.mkdirSync(this.options.root, { recursive: true });
    }

    for (const dir of fs.readdirSync(this.options.root)) {
      try {
        if (
          !fs
            .statSync(path.join(this.options.root, dir))
            .isDirectory()
        ) {
          continue;
        }

        const manifestPath = path.join(
          this.options.root,
          dir,
          MANIFEST_FILENAME
        );

        if (!fs.existsSync(manifestPath)) {
          log.warn(`Found folder without manifest: ${dir}. Skipping.`);
          continue;
        }

        const manifestContent = fs.readFileSync(manifestPath, {
          encoding: "utf-8",
        });

        const manifest = JSON.parse(manifestContent);
        this.validateManifest(manifest, dir);
        manifests.push(manifest);
      } catch (e) {
        log.error(`Failed to parse manifest in "${dir}":`, e);
      }
    }

    return manifests;
  }

  getManifest(id: string): Manifest {
    const directory = this.getDirectoryOf(id);
    const manifestContent = fs.readFileSync(
      path.join(directory, MANIFEST_FILENAME),
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
    if (!isValidManifestId(manifest.id)) {
      throw new ManifestError(
        `"${expectedId}" has a missing or invalid manifest id.`
      );
    }
    if (manifest.id !== expectedId) {
      throw new ManifestError(
        `Manifest id "${manifest.id}" does not match expected id "${expectedId}".`
      );
    }
  }

  getDirectoryOf(id: string | Manifest) {
    if (typeof id === "object") {
      id = id.id;
    }
    const root = path.resolve(this.options.root);
    const resolved = path.resolve(root, id);
    // Must be strictly *inside* the plugins directory. This rejects traversal
    // (`../`), absolute ids, and the empty/`.` id (which would resolve to the
    // plugins root itself and let `remove()` delete every installed plugin).
    if (!resolved.startsWith(root + path.sep)) {
      throw new PathTraversalError(
        `Refusing to access path outside root directory: ${id}`
      );
    }
    return resolved;
  }

  private getPath(manifest: Manifest, filename: string): string {
    const root = path.resolve(
      this.options.root,
      manifest.id
    );
    const resolved = path.resolve(root, filename);
    if (
      resolved !== root &&
      !resolved.startsWith(root + path.sep)
    ) {
      throw new PathTraversalError(
        `Refusing to access path outside directory: ${filename}`
      );
    }
    return resolved;
  }

  async hashFile(filePath: string): Promise<string> {
    try {
      const hash = crypto.createHash('sha256');
      const rs = fs.createReadStream(filePath);

      for await (const chunk of rs) {
        hash.update(chunk);
      }

      return hash.digest('hex');
    } catch (e) {
      log.error(`Error calculating hash for ${filePath}`);
      throw e;
    }

  }

  readAsset(manifest: Manifest, filename: string): string {
    const filePath = this.getPath(manifest, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, { encoding: "utf-8" });
  }

  exists(manifest: Manifest, filename: string): boolean {
    return fs.existsSync(this.getPath(manifest, filename));
  }
}
