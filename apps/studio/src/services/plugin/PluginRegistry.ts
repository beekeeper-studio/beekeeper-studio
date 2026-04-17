import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRepository, PluginRegistryEntry, PluginOrigin } from "./types";
import { NotFoundPluginError } from "./errors";

const log = rawLog.scope("PluginRegistry");

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  private officialEntries: PluginRegistryEntry[] = [];
  private communityEntries: PluginRegistryEntry[] = [];
  private officialEntriesCached = false;
  private communityEntriesCached = false;
  private repositories: Record<string, PluginRepository> = {};

  constructor(private readonly repositoryService: PluginRepositoryService) { }

  async getEntries() {
    try {
      await Promise.all([
        this.loadOfficialEntries(),
        this.loadCommunityEntries(),
      ]);
    } catch (e) {
      log.error("Failed to fetch registry", e);
      throw e;
    }

    return {
      official: this.officialEntries,
      community: this.communityEntries,
    };
  }

  async findEntry(id: string): Promise<{
    origin: PluginOrigin;
    entry: PluginRegistryEntry;
  }> {
    const entries = await this.getEntries();
    const official = entries.official.find((e) => e.id === id);
    if (official) {
      return { origin: "official", entry: official };
    }
    const community = entries.community.find((e) => e.id === id);
    if (community) {
      return { origin: "community", entry: community };
    }
    throw new NotFoundPluginError(`Plugin "${id}" not found in registry.`);
  }

  private async loadOfficialEntries() {
    if (this.officialEntriesCached) {
      return;
    }
    log.debug("Fetching official entries...");
    const result = await this.repositoryService.fetchOfficial();
    this.officialEntries = result;
    this.officialEntriesCached = true;
  }

  private async loadCommunityEntries() {
    if (this.communityEntriesCached) {
      return;
    }
    log.debug("Fetching community entries...");
    const result = await this.repositoryService.fetchCommunity();
    this.communityEntries = result;
    this.communityEntriesCached = true;
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
    const { entry } = await this.findEntry(pluginId);

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
    this.communityEntriesCached = false;
    this.officialEntriesCached = false;
    this.repositories = {};
  }
}
