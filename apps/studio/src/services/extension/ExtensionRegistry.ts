import rawLog from "@bksLogger";
import ExtensionRepositoryService from "@/services/extension/ExtensionRepositoryService";
import { ExtensionRepository, RegistryConfig, ExtensionRegistryEntry, RegistryMap } from "@/services/plugin/types";
import { ExtensionRegistryError } from "@/lib/errors";

const log = rawLog.scope("ExtensionRegistry");

/** Use this to cache and get plugin info. */
export default class ExtensionRegistry {
  public repositoryService: ExtensionRepositoryService;
  public registries: RegistryConfig[];
  /** Disable fetching community entries. */
  public communityDisabled = false;
  /** Disable fetching official entries. */
  public officialDisabled = false;
  /** Failures from the most recent load, by registry name. */
  public errors: Record<string, string> = {};

  private repositories: Record<string, ExtensionRepository> = {};
  private entriesMap: Map<string, ExtensionRegistryEntry[]> = new Map<string, ExtensionRegistryEntry[]>();
  private cached: Set<string> = new Set<string>();

  constructor(readonly options?: {
    repositoryService?: ExtensionRepositoryService,
    registries?: RegistryConfig[]
  }) {
    this.repositoryService =
      options?.repositoryService ?? new ExtensionRepositoryService();
    this.registries = options?.registries ? [...options.registries] : [];
  }

  async initialize() {
    await this.repositoryService.initialize();
  }

  async getEntries(): Promise<RegistryMap> {
    await this.loadAllEntries();

    return Object.fromEntries(
      this.registries.map((reg) => [reg.name, this.entriesMap.get(reg.name) ?? []])
    ) as RegistryMap;
  }

  async findEntry(id: string): Promise<ExtensionRegistryEntry> {
    await this.loadAllEntries();
    for (const reg of this.registries) {
      const entries = this.entriesMap.get(reg.name);
      if (entries) {
        const plugin = entries.find((e) => e.id === id);
        if (plugin) {
          return plugin;
        }
      }
    }
    throw new ExtensionRegistryError(
      "ENTRY_NOT_FOUND",
      `Extension "${id}" not found in registry.`
    );
  }

  private async loadAllEntries() {
    this.errors = {};
    try {
      await Promise.all(this.registries.map((config) => this.loadEntries(config).catch((e) => {
        log.warn(`Failed to fetch registry ${config.name}`, e);
        this.errors[config.name] = e?.message ?? String(e);
      })));
    } catch (e) {
      log.error("Failed to fetch registry", e);
    }
  }

  private canLoadConfig(config: RegistryConfig): boolean {
    if (config.origin === 'official' && this.officialDisabled) {
      log.debug(`Skipping loading entries for ${config.name}, Official Disabled.`);
      return false;
    } else if (config.origin === 'community' && this.communityDisabled) {
      log.debug(`Skipping loading entries for ${config.name}, Community Disabled.`);
      return false;
    } else {
      return true;
    }
  }

  private async loadEntries(config: RegistryConfig) {
    if (!this.canLoadConfig(config)) {
      return;
    }

    if (this.cached.has(config.name)) {
      log.debug(`Skipping loading entries for ${config.name}, Already Cached.`);
      return;
    }

    log.debug(`Fetching ${config.name} entries`);
    const result = await this.repositoryService.fetchRegistry(config);
    this.entriesMap.set(config.name, result);
    this.cached.add(config.name);
  }

  /** Get the info for a specific plugin. The data is always cached. To force
   * a reload, use `reloadRepository`. */
  async getRepository(pluginId: string): Promise<ExtensionRepository> {
    if (Object.hasOwn(this.repositories, pluginId)) {
      return this.repositories[pluginId];
    }
    return await this.reloadRepository(pluginId);
  }

  async reloadRepository(pluginId: string): Promise<ExtensionRepository> {
    const entry: ExtensionRegistryEntry = await this.findEntry(pluginId);

    log.debug(
      `Fetching info for plugin "${pluginId}" (repo: ${entry.repo})...`
    );

    try {
      const [owner, repo] = entry.repo.split("/");
      const info = await this.repositoryService.fetchPluginRepository(
        owner,
        repo,
        entry.origin
      );
      this.repositories[pluginId] = info;
      return info;
    } catch (e) {
      log.error(`Failed to fetch info for plugin "${pluginId}"`, e);
      throw e;
    }
  }

  clearCache() {
    this.cached.clear();
    this.entriesMap.clear();
    this.repositories = {};
  }
}
