import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRegistryEntry, PluginRepositoryInfo } from "./types";

const log = rawLog.scope("PluginRegistry");

/** Use this to cache and get plugin info. */
export default class PluginRegistry {
  private entries: PluginRegistryEntry[] = [];
  private repositoryInfos: Record<string, PluginRepositoryInfo> = {};

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

  async getRepositoryInfo(
    entry: PluginRegistryEntry,
    options: { reload?: boolean } = {}
  ): Promise<PluginRepositoryInfo> {
    if (!options.reload && Object.hasOwn(this.repositoryInfos, entry.id)) {
      return this.repositoryInfos[entry.id];
    }

    log.debug(`Fetching info for plugin "${entry.id}"...`, entry);

    try {
      const [owner, repo] = entry.repo.split("/");
      const info = await this.repositoryService.fetchEntryInfo(owner, repo);
      this.repositoryInfos[entry.id] = info;
      return info;
    } catch (e) {
      log.error(`Failed to fetch info for plugin "${entry.id}"`, e);
      throw e;
    }
  }
}
