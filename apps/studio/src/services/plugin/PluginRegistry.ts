import rawLog from "@bksLogger";
import { PluginRegistryEntry, PluginRepositoryInfo } from "./types";

const log = rawLog.scope("PluginRegistry");

/** Information about plugins from the registry or remote repository. */
export default class PluginRegistry {
  readonly registryUrl =
    "https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio-plugins/main/plugins.json";

  private entries: PluginRegistryEntry[] = [];
  private repositoryInfos: Record<string, PluginRepositoryInfo> = {};

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
    let res: Response;

    res = await fetch(
      `https://raw.githubusercontent.com/${entry.repo}/HEAD/manifest.json`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch plugin manifest: ${res.statusText}`);
    }
    const manifest = await res.json();

    res = await fetch(
      `https://raw.githubusercontent.com/${entry.repo}/HEAD/README.md`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch plugin manifest: ${res.statusText}`);
    }
    const readme = await res.text();

    return { manifest, readme };
  }
}
