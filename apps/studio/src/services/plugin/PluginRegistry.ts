import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRepository, PluginRegistryEntry } from "./types";

const log = rawLog.scope("PluginRegistry");

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  entries: PluginRegistryEntry[] = [];
  repositories: Record<string, PluginRepository> = {};

  constructor(private readonly repositoryService: PluginRepositoryService) {}

  async getEntries() {
    if (this.entries.length === 0) {
      log.debug("Fetching registry...");

      try {
        this.entries = await this.repositoryService.fetchRegistry();
      } catch (e) {
        log.error("Failed to fetch registry", e);
        throw e;
      }
    }

    return this.entries;
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
    const entries = await this.getEntries();
    const entry = entries.find((entry) => entry.id === pluginId);

    if (!entry) {
      throw new Error(`Plugin "${pluginId}" not found in registry.`);
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
}
