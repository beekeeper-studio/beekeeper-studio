import {
  Manifest,
  PluginRegistryEntry,
  PluginRepository,
} from "@/services/plugin";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginServer } from "./server";

type Plugin = {
  id: string;
  name: string;
  versions: {
    version: string;
    minAppVersion: string;
  }[];
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
        description: `A cool plugin and stuff named ${plugin.name}`,
      };

      registry.entries.push(entry);

      const releases = plugin.versions.map((options) => ({
        manifest: {
          id: entry.id,
          name: entry.name,
          version: options.version,
          author: entry.author,
          description: entry.description,
          minAppVersion: options.minAppVersion,
        } as Manifest,
        sourceArchiveUrl: server.formatUrl(options),
      }));

      registry.repositories[plugin.id] = {
        releases,
        latestRelease: releases[releases.length - 1],
        readme: `# ${plugin.name}\n\nThis is a test plugin.`,
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
