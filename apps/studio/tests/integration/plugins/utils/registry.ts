import type { Manifest, PluginRegistryEntry, Release } from "@/services/plugin/types";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginServer } from "./server";
import _ from "lodash";

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
 *
 * // To mock the plugins.json file, call setPlugins()
 * registry.setPlugins([{ id: "test-plugin" }]);
 *
 * // To mock the plugin release, call setLatestRelease()
 * // IMPORTANT: Make sure to register the plugin with setPlugins() first!
 * registry.setLatestRelease([{ id: "test-plugin", version: "1.0.0", minAppVersion: "1.0.0" }]);
 *
 * const manager = new PluginManager({ registry });
 * ```
 */
export class MockPluginRepositoryService extends PluginRepositoryService {
  private communityEntries: PluginRegistryEntry[] = [];
  private coreEntries: PluginRegistryEntry[] = [];
  private releases = new Map<string, Release>();

  constructor(private server: MockPluginServer) {
    super();
  }

  setPluginsJson(type: "core" | "community", plugins: (Partial<PluginRegistryEntry> & { id: string; })[]) {
    const finalPlugins = plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name ?? _.startCase(plugin.id),
      repo: plugin.repo ?? `${plugin.id}/${plugin.id}`,
      author: plugin.author ?? `${plugin.id} Author`,
      description: plugin.description ?? `${plugin.id} description`,
    }));

    if (type === "core") {
      this.coreEntries = finalPlugins;
    } else {
      this.communityEntries = finalPlugins;
    }

  }

  setLatestRelease(options: Pick<Manifest, "id" | "version" | "minAppVersion">): Release {
    const allPlugins = [...this.coreEntries, ...this.communityEntries];
    const plugin = allPlugins.find((p) => p.id === options.id);
    if (!plugin) {
      throw new Error(`Plugin "${options.id}" not found in registry. Have you registered the plugin with setPlugins?`)
    }

    const manifest: Manifest = {
      id: options.id,
      name: plugin.name,
      version: options.version,
      minAppVersion: options.minAppVersion,
      author: `${plugin.name} Author`,
      description: `${plugin.name} description`,
      manifestVersion: 1 as const,
      capabilities: {
        views: [],
        menu: [],
      },
    };

    const release: Release = {
      manifest,
      sourceArchiveUrl: this.server.formatUrl(manifest),
    };

    this.releases.set(options.id, release);

    return release;
  }

  // ===== OVERIDE METHODS =====

  async fetchRegistry() {
    return  {
      core: this.coreEntries,
      community: this.communityEntries,
    };
  }

  async fetchLatestRelease(owner: string, repo: string): Promise<Release> {
    const allPlugins = [...this.coreEntries, ...this.communityEntries];
    const plugin = allPlugins.find((p) => `${p.id}/${p.id}` === `${owner}/${repo}`);
    if (!plugin) {
      throw new Error(
        `Plugin "${owner}/${repo}" not found in registry. Have you registered the plugin with setPlugins?`
      );
    }
    if (!this.releases.has(plugin.id)) {
      throw new Error(`No release found for plugin "${plugin.id}". Have you create a release with setLatestRelease?`)
    }
    return this.releases.get(plugin.id);
  }

  protected async fetchReadme(owner: string, repo: string): Promise<string> {
    const allPlugins = [...this.coreEntries, ...this.communityEntries];
    const plugin = allPlugins.find((p) => `${p.id}/${p.id}` === `${owner}/${repo}`);
    if (!plugin) {
      throw new Error(
        `Plugin "${owner}/${repo}" not found in registry. Have you registered the plugin with setPlugins?`
      );
    }
    return `# ${plugin.name}\n\nThis is a test plugin.`;
  }
}

