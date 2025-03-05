import rawLog from "@bksLogger";
import PluginRepositoryService from "./PluginRepositoryService";
import { PluginRegistryEntry, PluginRepositoryInfo } from "./types";

const log = rawLog.scope("PluginRegistry");

/** Information about plugins from the registry or remote repository. */
export default class PluginRegistry {
  readonly registryUrl =
    "https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio-plugins/main/plugins.json";

  private entries: PluginRegistryEntry[] = [];
  private repositoryInfos: Record<string, PluginRepositoryInfo> = {};
  private repositoryService: PluginRepositoryService =
    new PluginRepositoryService();

  async getEntries() {
    if (this.entries.length === 0) {
      this.entries = await this.fetchRegistry();
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
    const head = await this.fetchEntryInfo(entry);
    this.repositoryInfos[entry.id] = head;
    return head;
  }

  async fetchRegistry() {
    const res = await fetch(this.registryUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch registry: ${res.statusText}`);
    }
    const entries: PluginRegistryEntry[] = await res.json();
    return entries;
  }

  async fetchEntryInfo(entry: PluginRegistryEntry) {
    log.debug(`Fetching info for plugin "${entry.id}"...`, entry);
    const [owner, repo] = entry.repo.split("/");
    const manifest = await this.repositoryService.fetchPluginManifest(
      owner,
      repo
    );
    const readme = await this.repositoryService.fetchPluginReadme(owner, repo);
    return { manifest, readme };
  }
}
