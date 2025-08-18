import {
  Manifest,
  PluginRegistryEntry,
  PluginRepository,
  Release,
} from "@/services/plugin";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginServer } from "./server";
import { SemVer } from "semver";

type Plugin = {
  id: string;
  name: string;
  releases: {
    version: string;
    minAppVersion: string;
  }[];
  readme: string;
};

/**
 * Create a plugin registry with the given plugins.
 *
 * Usage:
 *
 * ```js
 * describe("Plugin Management", () => {
 *   const server = createPluginServer();
 *   const registry = createRegistry(server, [
 *     // the plugins here...
 *   ]);
 *
 *   it("can do it", async () => {
 *     const manager = new PluginManager({ registry });
 *     await manager.initialize();
 *   })
 * });
 * ```
 */
export function createRegistry(server: MockPluginServer, plugins: Plugin[]) {
  const registry = new MockPluginRegistry(new PluginRepositoryService());

  server.onReady(() => {
    for (const plugin of plugins) {
      const entry: PluginRegistryEntry = {
        id: plugin.id,
        name: plugin.name,
        repo: `${plugin.id}/${plugin.id}`,
        author: `${plugin.id}-author`,
        description: `${plugin.name} description`,
      };

      registry.entries.push(entry);

      const releases: Release[] = plugin.releases.map((options) => ({
        version: new SemVer(options.version),
        beta: false,
        sourceArchiveUrl: server.formatUrl(options),
      }));

      registry.repositories[plugin.id] = {
        releases,
        readme: plugin.readme,
      };
    }
  });

  return registry;
}

class MockPluginRegistry extends PluginRegistry {
  // Override to skip network fetching and return the cached repository instead
  async reloadRepository(pluginId: string): Promise<PluginRepository> {
    return this.repositories[pluginId];
  }
}
