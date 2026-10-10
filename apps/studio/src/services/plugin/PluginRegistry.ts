import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRepository, RegistryConfig, PluginRegistryEntry, RegistryMap } from "./types";
import { PluginSystemError } from "@/lib/errors";

const log = rawLog.scope("PluginRegistry");

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  /** Disable fetching community entries. */
  public communityDisabled = false;
  /** Disable fetching official entries. */
  public officialDisabled = false;

  private repositories: Record<string, PluginRepository> = {};
  private entriesMap: Map<string, PluginRegistryEntry[]> = new Map<string, PluginRegistryEntry[]>();
  private cached: Set<string> = new Set<string>();
  private defaultRegistries: RegistryConfig[] = [
    {
      name: "official",
      origin: "official",
      owner: "not-night-but",
      repo: "bks-plugins",
      file: "official.json"
    },
    {
      name: "community",
      origin: "community",
      owner: "not-night-but",
      repo: "bks-plugins",
      file: "community.json"
    },
  ]

  private additionalRegistries: RegistryConfig[] = [];

  private get registries() {
    return [
      ...this.defaultRegistries,
      ...this.additionalRegistries
    ]
  }

  constructor(private readonly repositoryService: PluginRepositoryService) {
  }

  async getEntries(): Promise<RegistryMap> {
    await this.loadAllEntries();

    return Object.fromEntries(this.entriesMap.entries()) as RegistryMap;
  }

  async findEntry(id: string): Promise<PluginRegistryEntry> {
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
    throw new PluginSystemError(
      "PLUGIN_NOT_FOUND",
      `Plugin "${id}" not found in registry.`
    );
  }

  private async loadAllEntries() {
    try {
      await Promise.all(this.registries.map((config) => this.loadEntries(config)));
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
  async getRepository(pluginId: string): Promise<PluginRepository> {
    if (Object.hasOwn(this.repositories, pluginId)) {
      return this.repositories[pluginId];
    }
    return await this.reloadRepository(pluginId);
  }

  async reloadRepository(pluginId: string): Promise<PluginRepository> {
    const entry = await this.findEntry(pluginId);

    log.debug(
      `Fetching info for plugin "${pluginId}" (repo: ${entry.repo})...`
    );

    try {
      const [owner, repo] = entry.repo.split("/");
      const info = await this.repositoryService.fetchPluginRepository(
        owner,
        repo
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

  addRegistry(registry: RegistryConfig) {
    this.additionalRegistries.push(registry);
  }

  clearRegistries() {
    this.additionalRegistries = [];
  }
}
