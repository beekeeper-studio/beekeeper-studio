import path from "path";
import semver from "semver";
import { watch, FSWatcher } from "chokidar";
import ExtensionFileManager from "@/services/extension/ExtensionFileManager";
import globals from "@/common/globals";
import {
  ExtensionOrigin,
  Release,
  ThemeDisableState,
  ThemeManifest,
  ThemeSnapshot,
} from "@/services/plugin/types";
import ExtensionRegistry from "@/services/extension/ExtensionRegistry";
import rawLog from "@bksLogger";
import { ExtensionRegistryError, ThemeSystemError } from "@/lib/errors";
import { ThemeEntryCache } from "@/common/appdb/models/ThemeEntryCache";
import { Hookable } from "@/services/plugin/Hookable";
import type { ThemeModuleHookMap } from "./modules/ThemeModule";

const log = rawLog.scope("ThemeManager");

export type ThemeManagerOptions = {
  fileManager: ExtensionFileManager<ThemeManifest>;
  registry?: ExtensionRegistry;
};

export class ThemeManager extends Hookable<ThemeManager, ThemeModuleHookMap> {
  private initialized = false;
  public readonly registry: ExtensionRegistry;
  public readonly fileManager: ExtensionFileManager<ThemeManifest>;
  private manifests: ThemeManifest[] = [];
  private themeLocks: string[] = [];
  private watcher: FSWatcher = null;
  private watchListeners = new Map<
    string,
    { themeId: string; onChange: (themeId: string) => void }
  >();

  constructor(readonly options: ThemeManagerOptions) {
    super();
    this.fileManager = options.fileManager;
    this.registry =
      options.registry ||
      new ExtensionRegistry({ registries: globals.themes.registries });
  }

  async initialize() {
    if (this.initialized) {
      log.warn("Calling initialize when already initialized");
      return;
    }

    await this.registry.initialize();

    const installedThemes = this.fileManager.scan().filter((manifest) => {
      if (this.isBundled(manifest.id)) {
        log.warn(
          `Ignoring theme "${manifest.name}": id "${manifest.id}" is reserved by a bundled theme.`
        );
        return false;
      }
      return true;
    });

    this.manifests = installedThemes;

    log.debug("Installed themes:", installedThemes);

    this.initialized = true;

    await this.callHook("after-initialize");
  }

  /** Install the latest version of a theme. */
  async installTheme(id: string): Promise<ThemeManifest> {
    this.initializeGuard();

    if (this.isBundled(id)) {
      throw new ThemeSystemError(
        "THEME_ID_RESERVED",
        `Theme id "${id}" is reserved by a bundled theme.`
      );
    }

    const update = this.manifests.some((manifest) => manifest.id === id);

    if (!update) {
      await this.callHook("before-install-theme", id);
    }

    return await this.withThemeLock(id, async () => {
      const info = await this.registry.getRepository(id);
      if (!info) {
        throw new ThemeSystemError(
          "THEME_NOT_FOUND",
          `Theme "${id}" not found in registry.`
        );
      }
      const latestRelease = info.latestRelease as Release<ThemeManifest>;

      // The theme is downloaded into a directory named after the registry id,
      // so the manifest id must match it.
      if (latestRelease.manifest.id !== id) {
        throw new ThemeSystemError(
          "MANIFEST_ID_MISMATCH",
          `Theme "${id}" manifest declares mismatched id "${latestRelease.manifest.id}".`
        );
      }

      log.debug(`Installing theme "${id}" ${latestRelease.manifest.version}...`);

      if (update) {
        await this.fileManager.update(id, latestRelease);
      } else {
        await this.fileManager.download(id, latestRelease);
      }

      const entry = await this.registry.findEntry(id);
      if (entry) {
        let cache = await ThemeEntryCache.findOneBy({ id });

        if (!cache) {
          cache = new ThemeEntryCache();
        }

        await cache.withProps(entry).save();
      }

      const manifest = this.fileManager.getManifest(id);
      const installedIdx = this.manifests.findIndex(
        (manifest) => manifest.id === id
      );
      if (installedIdx === -1) {
        this.manifests.push(manifest);
      } else {
        this.manifests[installedIdx] = manifest;
      }

      log.info(`Installed theme "${id}" v${latestRelease.manifest.version}`);

      return manifest;
    });
  }

  async updateTheme(id: string): Promise<ThemeManifest> {
    this.initializeGuard();
    await this.registry.reloadRepository(id);
    return await this.installTheme(id);
  }

  async uninstallTheme(id: string): Promise<void> {
    this.initializeGuard();
    return await this.withThemeLock(id, async () => {
      log.debug(`Uninstalling theme "${id}"...`);

      this.fileManager.remove(id);
      this.manifests = this.manifests.filter((manifest) => manifest.id !== id);

      log.debug(`Theme "${id}" uninstalled!`);
    });
  }

  async getThemes(): Promise<ThemeSnapshot[]> {
    this.initializeGuard();

    const snapshots: ThemeSnapshot[] = globals.themes.bundled.map(
      (manifest) => ({
        manifest,
        origin: "bundled",
        disableState: { disabled: false },
      })
    );

    for (const manifest of this.manifests) {
      let origin: ExtensionOrigin = "unlisted";

      try {
        const found = await this.registry.findEntry(manifest.id);
        origin = found.origin;
      } catch (e) {
        if (e instanceof ExtensionRegistryError && e.code === "ENTRY_NOT_FOUND") {
          // Not in the registry now; it may have been installed from one before.
          const cached = await ThemeEntryCache.findOneBy({ id: manifest.id });
          if (cached && cached.origin) {
            origin = cached.origin;
          }
        } else {
          log.error(e);
        }
      }

      snapshots.push({
        manifest,
        origin,
        disableState: this.getDisableState(manifest),
      });
    }

    return await this.applyHook("theme-snapshots", snapshots);
  }

  async checkForUpdates(id: string): Promise<boolean> {
    this.initializeGuard();

    const manifest = this.manifests.find((manifest) => manifest.id === id);
    if (!manifest) {
      throw new Error(`Theme "${id}" is not installed.`);
    }

    const head = await this.registry.reloadRepository(id);
    const latest = semver.coerce(head.latestRelease.manifest.version);
    const current = semver.coerce(manifest.version);

    return !!latest && !!current && semver.gt(latest, current);
  }

  async getThemeAsset(manifest: ThemeManifest, filename: string): Promise<string> {
    this.initializeGuard();
    return this.fileManager.readAsset(manifest, filename);
  }

  private isBundled(id: string): boolean {
    return globals.themes.bundled.some((theme) => theme.id === id);
  }

  private getDisableState(manifest: ThemeManifest): ThemeDisableState {
    if (!this.fileManager.exists(manifest, "style.css")) {
      return { disabled: true, reason: "missing-style" };
    }

    return { disabled: false };
  }

  private stylePath(themeId: string): string {
    return path.join(this.fileManager.getDirectoryOf(themeId), "style.css");
  }

  /** Watch the `style.css` of the theme each listener is using, including it being deleted or restored. */
  watch(key: string, themeId: string, onChange: (themeId: string) => void) {
    this.watchListeners.set(key, { themeId, onChange });

    if (!this.watcher) {
      this.watcher = watch([], { ignoreInitial: true })
        .on("change", this.notifyWatchers)
        .on("add", this.notifyWatchers)
        .on("unlink", this.notifyWatchers);
    }

    const wanted = new Set(
      [...this.watchListeners.values()]
        .filter(({ themeId }) => !this.isBundled(themeId))
        .map(({ themeId }) => this.stylePath(themeId))
    );
    const watched = Object.entries(this.watcher.getWatched()).flatMap(
      ([dir, files]) => files.map((file) => path.join(dir, file))
    );

    this.watcher.unwatch(watched.filter((file) => !wanted.has(file)));
    this.watcher.add([...wanted]);
  }

  private notifyWatchers = (stylePath: string) => {
    const themeId = path.basename(path.dirname(stylePath));
    for (const [key, listener] of this.watchListeners) {
      if (listener.themeId !== themeId) {
        continue;
      }
      try {
        listener.onChange(themeId);
      } catch (e) {
        log.debug("Dropping theme watch listener", e);
        this.watchListeners.delete(key);
      }
    }
  };

  private async withThemeLock<T>(
    id: string,
    callback: () => T | Promise<T>
  ): Promise<T> {
    let ret: T;

    if (this.themeLocks.includes(id)) {
      throw new Error(`Theme "${id}" is not idle.`);
    }

    this.themeLocks.push(id);

    try {
      ret = await callback();
    } finally {
      this.themeLocks = this.themeLocks.filter((lock) => lock !== id);
    }

    return ret;
  }

  private initializeGuard() {
    if (!this.initialized) {
      throw new Error("Theme manager is not initialized.");
    }
  }
}
