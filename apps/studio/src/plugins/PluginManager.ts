import _ from "lodash";
import path from "path";
import fs from "fs";
import { Downloader, DownloaderConfig } from "nodejs-file-downloader";

const log = console.log;

class PluginDownloadError extends Error {
  status: "UNKNOWN" | "NOT_FOUND" | "ABORTED" = "UNKNOWN";

  constructor(
    message: string,
    public originalError?: Error,
  ) {
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

  try {
    const downloader = new Downloader(options);
    options.signal?.addEventListener("abort", downloader.cancel);
    const result = await downloader.download().finally(() => {
      options.signal?.removeEventListener("abort", downloader.cancel);
    });
    downloadStatus = result.downloadStatus;
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
}

function getPluginDirectory(manifest: Manifest) {
  return path.join(__dirname, "plugins", manifest.id);
}

class PluginEntry {
  id: string;
  name: string;
  author: string;
  description: string;
  repo: string;
  remoteManifest: string;

  constructor(publication: PluginEntry) {
    Object.assign(this, publication);
    this.remoteManifest = `https://raw.githubusercontent.com/${publication.repo}/HEAD/manifest.json`;
  }
}

interface Manifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  author: string;
}

function validateManifest(target: any): asserts target is Manifest {
  function nonEmptyString(v: any) {
    return _.isString(v) && v.length > 0;
  }
  const valid = _.conformsTo(target, {
    id: nonEmptyString,
    name: nonEmptyString,
    version: nonEmptyString,
    minAppVersion: nonEmptyString,
    author: nonEmptyString,
  });
  if (!valid) {
    throw new Error(`Manifest is invalid.`);
  }
}

class ReleasedPlugin {
  constructor(
    public readonly manifest: Manifest,
    public readonly repo: string,
  ) {}

  get manifestUrl() {
    return `https://github.com/${this.repo}/releases/download/${this.manifest.version}/manifest.json`;
  }

  get scriptUrl() {
    return `https://github.com/${this.repo}/releases/download/${this.manifest.version}/index.js`;
  }

  get styleUrl() {
    return `https://github.com/${this.repo}/releases/download/${this.manifest.version}/style.css`;
  }
}

class InstalledPlugin {
  constructor(public readonly manifest: Manifest) {}

  get location() {
    return path.join(__dirname, "plugins", this.manifest.id);
  }

  get manifestLocation() {
    return path.join(this.location, "manifest.json");
  }

  get scriptLocation() {
    return path.join(this.location, "index.js");
  }

  get styleLocation() {
    return path.join(this.location, "style.css");
  }
}

export class PluginManager {
  readonly registryUrl =
    "https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio-plugins/main/plugins.json";

  private pluginEntries: PluginEntry[] = [];
  private installedPlugins: InstalledPlugin[] = [];

  async loadRegistry() {
    const res = await fetch(this.registryUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch registry: ${res.statusText}`);
    }
    this.pluginEntries = (await res.json()).map(
      (plugin: any) => new PluginEntry(plugin),
    );
  }

  async installPlugin(
    entry: PluginEntry,
    options: { signal?: AbortSignal } = {},
  ): Promise<InstalledPlugin> {
    log(`Installing plugin "${entry.name}"...`);

    log(`Fetching plugin manifest: "${entry.remoteManifest}"...`);
    const manifest = await fetch(entry.remoteManifest).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch plugin manifest: ${res.statusText}`);
      }
      return res.json();
    });
    validateManifest(manifest);

    const directory = getPluginDirectory(manifest);
    if (fs.existsSync(directory)) {
      throw new Error(`Plugin ${manifest.name} is already installed.`);
    }

    try {
      const releasedPlugin = new ReleasedPlugin(manifest, entry.repo);

      // Make plugin directory
      fs.mkdirSync(directory, { recursive: true });

      log(`Downloading plugin manifest: "${releasedPlugin.manifestUrl}"...`);
      await download({
        url: releasedPlugin.manifestUrl,
        directory,
        signal: options.signal,
      });

      log(`Downloading plugin script: "${releasedPlugin.scriptUrl}"...`);
      await download({
        url: releasedPlugin.scriptUrl,
        directory,
        signal: options.signal,
      });

      log(`Downloading plugin style: "${releasedPlugin.styleUrl}"...`);
      await download({
        url: releasedPlugin.styleUrl,
        directory,
        signal: options.signal,
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

    log(`Plugin "${manifest.name}" installed!`);

    const installedPlugin = new InstalledPlugin(manifest);
    this.installedPlugins.push(installedPlugin);
    return installedPlugin;
  }

  async updatePlugin(plugin: InstalledPlugin) {
    log(`Updating plugin "${plugin.manifest.name}"...`);

    // TODO download all files but with different names
    // if all succeed, replace files
    // when errors, remove the downloaded files
    log(`Plugin "${plugin.manifest.name}" updated.`);
  }

  async checkForUpdate(plugin: InstalledPlugin) {
    const publication = this.pluginEntries.find(
      (p) => p.id === plugin.manifest.id,
    );
    if (!publication) {
      throw new Error(`Plugin ${plugin.manifest.id} not found in registry.`);
    }
    const remoteManifest = await fetch(publication.remoteManifest).then((res) =>
      res.json(),
    );
    validateManifest(remoteManifest);
    return remoteManifest.version > plugin.manifest.version;
  }

  getPluginEntries() {
    return this.pluginEntries;
  }

  getInstalledPlugins() {
    return this.installedPlugins;
  }
}
