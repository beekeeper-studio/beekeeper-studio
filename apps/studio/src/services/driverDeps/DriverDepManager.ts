import rawLog from "@bksLogger";
import semver from "semver";
import { UserSetting } from "@/common/appdb/models/user_setting";
import DriverDepRegistry from "./DriverDepRegistry";
import DriverDepFileManager from "./DriverDepFileManager";
import {
  DepPlatform,
  DepArch,
  DriverDepStatus,
  DownloadProgress,
  InstalledDriverDep,
  DriverDepProviderInfo,
} from "./types";

const log = rawLog.scope("DriverDepManager");

export interface DriverDepManagerOptions {
  fileManager: DriverDepFileManager;
  registry: DriverDepRegistry;
  platform: DepPlatform;
  arch: DepArch;
}

export default class DriverDepManager {
  private initialized = false;
  private installed = new Map<string, InstalledDriverDep>();
  private locks = new Set<string>();

  private readonly fileManager: DriverDepFileManager;
  private readonly registry: DriverDepRegistry;
  private readonly platform: DepPlatform;
  private readonly arch: DepArch;

  constructor(options: DriverDepManagerOptions) {
    this.fileManager = options.fileManager;
    this.registry = options.registry;
    this.platform = options.platform;
    this.arch = options.arch;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const scanned = this.fileManager.scanInstalled();
    for (const dep of scanned) {
      this.installed.set(dep.requirementId, dep);
    }

    log.debug(`Found ${scanned.length} installed driver dep(s)`);
    this.initialized = true;
  }

  async getStatuses(): Promise<DriverDepStatus[]> {
    this.guardInitialized();
    const requirements = this.registry.getAllRequirements();
    const statuses: DriverDepStatus[] = [];

    for (const req of requirements) {
      statuses.push(await this.getStatus(req.id));
    }

    return statuses;
  }

  async getStatus(requirementId: string): Promise<DriverDepStatus> {
    this.guardInitialized();
    const req = this.registry.getRequirement(requirementId);
    if (!req) {
      throw new Error(`Unknown requirement: "${requirementId}"`);
    }

    const installed = this.installed.get(requirementId);
    const hasProvider = this.registry.hasProvider(requirementId);

    let latestVersion: string | undefined;
    let updateAvailable = false;

    if (hasProvider && installed) {
      try {
        const provider = this.registry.getProvider(requirementId);
        const info = await provider.resolve();
        latestVersion = info.version;
        const installedSemver = semver.coerce(installed.version);
        const latestSemver = semver.coerce(info.version);
        if (installedSemver && latestSemver) {
          updateAvailable = semver.gt(latestSemver, installedSemver);
        }
      } catch (e) {
        log.warn(`Failed to resolve provider for "${requirementId}":`, e);
      }
    }

    return {
      requirement: req,
      installed: !!installed,
      installedVersion: installed?.version,
      installedPath: installed?.installedPath,
      latestVersion,
      updateAvailable,
      providerAvailable: hasProvider,
    };
  }

  getRequirementIdForSettingKey(settingKey: string): string | null {
    const req = this.registry.getRequirementBySettingKey(settingKey);
    return req?.id ?? null;
  }

  async getProviderInfo(requirementId: string): Promise<DriverDepProviderInfo | null> {
    const provider = this.registry.getProvider(requirementId);
    if (!provider) return null;
    return provider.resolve();
  }

  async install(
    requirementId: string,
    options?: {
      signal?: AbortSignal;
      onProgress?: (p: DownloadProgress) => void;
    }
  ): Promise<string> {
    this.guardInitialized();

    const req = this.registry.getRequirement(requirementId);
    if (!req) {
      throw new Error(`Unknown requirement: "${requirementId}"`);
    }

    return this.withLock(requirementId, async () => {
      const provider = this.registry.getProvider(requirementId);
      if (!provider) {
        throw new Error(`No provider available for "${requirementId}"`);
      }

      const info = await provider.resolve();
      const artifact = info.artifacts.find(
        (a) => a.platform === this.platform && a.arch === this.arch
      );

      if (!artifact) {
        throw new Error(
          `No artifact available for ${this.platform}/${this.arch} in "${requirementId}"`
        );
      }

      log.info(
        `Installing "${requirementId}" v${info.version} for ${this.platform}/${this.arch}...`
      );

      const installedPath = await this.fileManager.install(
        requirementId,
        artifact,
        info.extractedDirName,
        info.version,
        {
          signal: options?.signal,
          onProgress: options?.onProgress,
        }
      );

      // Update installed map
      const dep: InstalledDriverDep = {
        requirementId,
        version: info.version,
        installedPath,
        installedAt: new Date().toISOString(),
      };
      this.installed.set(requirementId, dep);

      // The integration contract: write the install path back to the
      // requirement's `settingKey`. This is the only thing connecting
      // the downloader to the driver — the driver already reads this
      // setting at connect time, so no driver-side changes are needed.
      // See docs/development/driver-dependencies.md.
      await UserSetting.set(req.settingKey, installedPath);
      log.info(
        `Setting "${req.settingKey}" updated to "${installedPath}"`
      );

      return installedPath;
    });
  }

  async checkForUpdate(requirementId: string): Promise<boolean> {
    this.guardInitialized();

    const installed = this.installed.get(requirementId);
    if (!installed) return false;

    const provider = this.registry.getProvider(requirementId);
    if (!provider) return false;

    try {
      const info = await provider.resolve();
      const installedSemver = semver.coerce(installed.version);
      const latestSemver = semver.coerce(info.version);
      if (installedSemver && latestSemver) {
        return semver.gt(latestSemver, installedSemver);
      }
    } catch (e) {
      log.warn(`Failed to check for update for "${requirementId}":`, e);
    }

    return false;
  }

  async remove(requirementId: string): Promise<void> {
    this.guardInitialized();

    const req = this.registry.getRequirement(requirementId);
    if (!req) {
      throw new Error(`Unknown requirement: "${requirementId}"`);
    }

    return this.withLock(requirementId, async () => {
      this.fileManager.remove(requirementId);
      this.installed.delete(requirementId);
      await UserSetting.set(req.settingKey, "");
      log.info(`Removed "${requirementId}" and cleared setting "${req.settingKey}"`);
    });
  }

  getInstalledPath(requirementId: string): string | null {
    return this.installed.get(requirementId)?.installedPath ?? null;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  private async withLock<T>(
    id: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    if (this.locks.has(id)) {
      throw new Error(`Operation already in progress for "${id}"`);
    }

    this.locks.add(id);
    try {
      return await fn();
    } finally {
      this.locks.delete(id);
    }
  }

  private guardInitialized(): void {
    if (!this.initialized) {
      throw new Error("DriverDepManager is not initialized");
    }
  }
}
