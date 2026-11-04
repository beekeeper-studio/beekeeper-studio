import fs from "fs";
import path from "path";
import semver from "semver";
import { watch, FSWatcher } from "chokidar";
import ExtensionFileManager from "@/services/extensions/ExtensionFileManager";
import globals from "@/common/globals";
import {
  ExtensionOrigin,
  ExtensionRegistryEntry,
  RegistryMap,
  Release,
  ThemeDisableState,
  ThemeManifest,
  ThemeSnapshot,
} from "@/services/plugin/types";
import type { BksConfig } from "@/common/bksConfig/BksConfigProvider";
import ExtensionRegistry from "@/services/extensions/ExtensionRegistry";
import rawLog from "@bksLogger";
import { PluginError, PluginSystemError } from "@/lib/errors";
import { ThemeEntryCache } from "@/common/appdb/models/ThemeEntryCache";
import { Hookable } from "@/services/plugin/Hookable";
import type { ThemeModuleHookMap } from "./modules/ThemeModule";

const log = rawLog.scope("ThemeManager");

export type ThemeManagerOptions = {
  fileManager: ExtensionFileManager<ThemeManifest>;
  config: BksConfig;
  registry?: ExtensionRegistry;
};

export class ThemeManager extends Hookable<ThemeManager, ThemeModuleHookMap> {
  public readonly fileManager: ExtensionFileManager<ThemeManifest>;
  public readonly registry: ExtensionRegistry;
  private watcher: FSWatcher = null;
  private initialized = false;
  private themeLocks: string[] = [];
  private autoUpdated = false;
  private watchListeners = new Map<string, (themeId: string) => void>();

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

    this.initialized = true;
  }

  /** Install the latest version of a theme. */
  async installTheme(id: string): Promise<ThemeManifest> {
    this.initializeGuard();

    if (this.isBundled(id)) {
      throw new PluginSystemError(
        "PLUGIN_NOT_SUPPORTED",
        `Theme id "${id}" is reserved by a bundled theme.`
      );
    }

    let update = false;

    // If theme is already installed, perform update
    if (this.fileManager.scan().find((manifest) => manifest.id === id)) {
      update = true;
    }

    return await this.withThemeLock(id, async () => {
      const info = await this.registry.getRepository(id);
      if (!info) {
        throw new PluginSystemError(
          "PLUGIN_NOT_FOUND",
          `Theme "${id}" not found in registry.`
        );
      }
      const latestRelease = info.latestRelease as Release<ThemeManifest>;

      // The theme is downloaded into a directory named after the registry id,
      // so the manifest id must match it.
      if (latestRelease.manifest.id !== id) {
        throw new PluginError(
          "MANIFEST_PARSE",
          `Theme "${id}" manifest declares mismatched id "${latestRelease.manifest.id}".`
        );
      }

      log.debug(`Installing theme "${id}" ${latestRelease.manifest.version}...`);

      if (update) {
        await this.fileManager.update(id, latestRelease);
      } else {
        await this.fileManager.download(id, latestRelease);
      }

      await this.rememberOrigin(await this.registry.findEntry(id));

      log.info(`Installed theme "${id}" v${latestRelease.manifest.version}`);

      return this.fileManager.getManifest(id);
    });
  }

  async uninstallTheme(id: string): Promise<void> {
    this.initializeGuard();
    return await this.withThemeLock(id, async () => {
      log.debug(`Uninstalling theme "${id}"...`);

      this.fileManager.remove(id);
      await ThemeEntryCache.delete({ id }).catch((e) => log.warn(e));

      log.debug(`Theme "${id}" uninstalled!`);
    });
  }

  async getThemes(): Promise<ThemeSnapshot[]> {
    const snapshots: ThemeSnapshot[] = globals.themes.bundled.map(
      (manifest) => ({
        manifest,
        origin: "bundled",
        disableState: { disabled: false },
      })
    );

    const manifests = this.fileManager.scan();
    const origins = await this.readCachedOrigins();

    for (const manifest of manifests) {
      const origin = origins.get(manifest.id) ?? "unlisted";

      snapshots.push({
        manifest,
        origin,
        disableState: this.getDisableState(manifest),
      });
    }

    this.watcher?.add(manifests.map((manifest) => this.stylePath(manifest.id)));

    return await this.applyHook("theme-snapshots", snapshots);
  }

  /** Fetch registry entries, remembering the origin of installed themes. */
  async getEntries(
    clearCache = false
  ): Promise<{ entries: RegistryMap; errors: string[] }> {
    if (clearCache) {
      this.registry.clearCache();
    }

    const entries = await this.registry.getEntries();
    const installed = this.fileManager.scan().map((manifest) => manifest.id);

    for (const entry of Object.values(entries).flat()) {
      if (installed.includes(entry.id) && !this.isBundled(entry.id)) {
        await this.rememberOrigin(entry);
      }
    }

    return { entries, errors: Object.values(this.registry.errors) };
  }

  async syncOrigins(): Promise<void> {
    if (this.fileManager.scan().length > 0) {
      await this.getEntries();
    }
  }

  /** Update registry themes to their latest release, once per app launch. */
  async autoUpdateThemes(): Promise<void> {
    this.initializeGuard();

    if (this.autoUpdated || !this.options.config.themeSystem.autoUpdate) {
      return;
    }
    this.autoUpdated = true;

    const themes = await this.getThemes();
    for (const { manifest, origin, disableState } of themes) {
      if (origin === "bundled" || origin === "unlisted" || disableState.disabled) {
        continue;
      }
      // A linked theme is someone's working copy, which a release must not replace.
      if (fs.lstatSync(this.fileManager.getDirectoryOf(manifest.id)).isSymbolicLink()) {
        continue;
      }
      try {
        if (await this.checkForUpdates(manifest.id)) {
          await this.installTheme(manifest.id);
        }
      } catch (e) {
        log.warn(`Failed to auto-update theme "${manifest.id}"`, e);
      }
    }
  }

  async checkForUpdates(id: string): Promise<boolean> {
    this.initializeGuard();

    const manifest = this.fileManager.getManifest(id);
    const head = await this.registry.reloadRepository(id);
    const latest = semver.coerce(head.latestRelease.manifest.version);
    const current = semver.coerce(manifest.version);

    return !!latest && !!current && semver.gt(latest, current);
  }

  private isBundled(id: string): boolean {
    return globals.themes.bundled.some((theme) => theme.id === id);
  }

  private async rememberOrigin({ id, origin }: ExtensionRegistryEntry) {
    try {
      await new ThemeEntryCache().withProps({ id, origin }).save();
    } catch (e) {
      log.warn(`Failed to remember origin of theme "${id}"`, e);
    }
  }

  private async readCachedOrigins(): Promise<Map<string, ExtensionOrigin>> {
    try {
      const cached = await ThemeEntryCache.find();
      return new Map(cached.map(({ id, origin }) => [id, origin]));
    } catch (e) {
      log.error(e);
      return new Map();
    }
  }

  private getDisableState(manifest: ThemeManifest): ThemeDisableState {
    if (this.isBundled(manifest.id)) {
      log.warn(
        `Ignoring theme "${manifest.name}": id "${manifest.id}" is reserved by a bundled theme.`
      );
      return { disabled: true, reason: "bundled-id-conflict" };
    }

    if (!this.fileManager.exists(manifest, "style.css")) {
      return { disabled: true, reason: "missing-style" };
    }

    return { disabled: false };
  }

  private stylePath(themeId: string): string {
    return path.join(this.fileManager.getDirectoryOf(themeId), "style.css");
  }

  /** Watch every installed theme's `style.css`, including it being deleted or restored. */
  watch(key: string, onChange: (themeId: string) => void) {
    this.watchListeners.set(key, onChange);

    if (this.watcher) {
      return;
    }

    const notify = (stylePath: string) => {
      const themeId = path.basename(path.dirname(stylePath));
      for (const [listenerKey, listener] of this.watchListeners) {
        try {
          listener(themeId);
        } catch (e) {
          log.debug("Dropping theme watch listener", e);
          this.watchListeners.delete(listenerKey);
        }
      }
    };

    this.watcher = watch(
      this.fileManager.scan().map((manifest) => this.stylePath(manifest.id)),
      { ignoreInitial: true }
    )
      .on("change", notify)
      .on("add", notify)
      .on("unlink", notify);
  }

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
