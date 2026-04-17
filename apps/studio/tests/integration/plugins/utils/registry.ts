import { Manifest, PluginOrigin, PluginRegistryEntry, Release } from "@/services/plugin";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginServer } from "./server";

export type Plugin = {
  id: string;
  name: string;
  latestRelease: Pick<Manifest, "version" | "minAppVersion">;
  readme: string;
  origin: PluginOrigin;
};

/**
 * A mock plugin repo.
 *
 * Usage:
 *
 * ```js
 * import { PluginRegistry } from "@/services/plugin/PluginRegistry";
 * import { MockPluginRepositoryService } from "./registry";
 *
 * const server = createPluginServer();
 * const registry = new PluginRegistry(new MockPluginRepositoryService(server));
 * registry.plugins = [
 *   {
 *     id: "test-plugin",
 *     name: "Test Plugin",
 *     latestRelease: { version: "2.0.0", minAppVersion: "5.4.0" },
 *     readme: "# Test Plugin\n\nThis is a test plugin.",
 *   },
 * ];
 * const manager = new PluginManager({ registry });
 * ```
 */
export class MockPluginRepositoryService extends PluginRepositoryService {
  plugins: Plugin[] = [];

  constructor(private server: MockPluginServer) {
    super();
  }

  protected async fetchJson(_owner: string, _repo: string, path: string): Promise<PluginRegistryEntry[]> {
    const plugins = this.plugins.filter((p) =>
      path === "plugins.json"
        ? p.origin === "official"
        : p.origin === "community"
    );
    return plugins.map((p) => ({
      id: p.id,
      name: p.name,
      repo: this.repoStr(p),
      author: this.authorStr(p),
      description: this.descriptionStr(p),
    }));
  }

  async fetchLatestRelease(owner: string, repo: string): Promise<Release> {
    const plugin = this.plugins.find(
      (p) => this.repoStr(p) === this.repoStr(owner, repo)
    );
    if (!plugin) {
      throw new Error(
        `Plugin "${owner}/${repo}" not found in registry. Have you registered the plugin?`
      );
    }
    return this.createLatestRelease(plugin);
  }

  protected async fetchReadme(owner: string, repo: string): Promise<string> {
    const plugin = this.plugins.find(
      (p) => this.repoStr(p) === this.repoStr(owner, repo)
    );
    if (!plugin) {
      throw new Error(
        `Plugin "${owner}/${repo}" not found in registry. Have you registered the plugin?`
      );
    }
    return plugin.readme;
  }

  private createLatestRelease(plugin: Plugin) {
    const manifest = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.latestRelease.version,
      minAppVersion: plugin.latestRelease.minAppVersion,
      author: this.authorStr(plugin),
      description: this.descriptionStr(plugin),
      capabilities: {
        views: [],
      },
    };
    return {
      manifest,
      sourceArchiveUrl: this.server.formatUrl(manifest),
    };
  }

  private repoStr(plugin: Plugin): string;
  private repoStr(owner: string, repo: string): string;
  private repoStr(owner: string | Plugin, repo?: string): string {
    if (typeof owner === "object") {
      return this.repoStr(owner.id, owner.id);
    }
    return `${owner}/${repo}`;
  }

  private authorStr(plugin: Plugin) {
    return `${plugin.id}-author`;
  }

  private descriptionStr(plugin: Plugin) {
    return `${plugin.name} description`;
  }
}
