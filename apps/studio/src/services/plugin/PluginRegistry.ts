import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRepository, PluginRegistryEntry, RawFetchRegistryResult } from "./types";
import { NotFoundPluginError } from "./errors";

const log = rawLog.scope("PluginRegistry");

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  entries: PluginRegistryEntry[] = [];
  private repositories: Record<string, PluginRepository> = {};

  constructor(private readonly repositoryService: PluginRepositoryService) {}

  findEntryById(id: string) {
    return this.entries.find((entry) => entry.id === id);
  }

  async fetch() {
    log.info("Fetching registry...");

    const registry = await this.repositoryService.fetchRegistry();

    const core = registry.core.map<PluginRegistryEntry>((entry) => ({
      ...entry,
      metadata: {
        origin: "core",
      },
    }));

    const community = registry.community.map<PluginRegistryEntry>((entry) => ({
      ...entry,
      metadata: {
        origin: "community",
      },
    }));

    this.entries = core.concat(community);

    return { errors: registry.errors }
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
    const entry = this.findEntryById(pluginId);
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
    this.entries = [];
    this.repositories = {};
  }
}
