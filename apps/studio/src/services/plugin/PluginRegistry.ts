import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRepository, PluginRegistryEntry } from "./types";
import { NotFoundPluginError } from "./errors";

const log = rawLog.scope("PluginRegistry");

export type PluginRegistryOptions = {
  onFetched?: (registry: { core: PluginRegistryEntry[]; community: PluginRegistryEntry[] }) => void | Promise<void>;
};

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  private coreEntries: PluginRegistryEntry[] = [];
  private communityEntries: PluginRegistryEntry[] = [];
  private repositories: Record<string, PluginRepository> = {};

  constructor(
    private readonly repositoryService: PluginRepositoryService,
    private readonly options?: PluginRegistryOptions
  ) {}

  findEntryById(id: string) {
    const core = this.coreEntries.find((entry) => entry.id === id);
    if (core) {
      return { ...core, origin: "core" as const };
    }
    const community = this.communityEntries.find((entry) => entry.id === id);
    if (community) {
      return { ...community, origin: "community" as const };
    }
  }

  setEntries(core: PluginRegistryEntry[], community: PluginRegistryEntry[]) {
    this.coreEntries = core;
    this.communityEntries = community;
  }

  async fetch() {
    log.info("Fetching registry...");

    const registry = await this.repositoryService.fetchRegistry();

    this.coreEntries = registry.core;
    this.communityEntries = registry.community;

    // Call onFetched callback if provided
    if (this.options?.onFetched) {
      await this.options.onFetched(registry);
    }
  }

  async getEntries() {
    return {
      core: this.coreEntries,
      community: this.communityEntries,
    };
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
    const { core, community } = await this.getEntries();
    const entries = core.concat(community);
    const entry = entries.find((entry) => entry.id === pluginId);

    if (!entry) {
      throw new NotFoundPluginError(`Plugin "${pluginId}" not found in registry.`);
    }

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
    this.fetched = false;
    this.coreEntries = [];
    this.communityEntries = [];
    this.repositories = {};
  }
}
