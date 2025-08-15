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
 * Use this inside a describe block like so:
 *
 * ```js
 * describe("Plugin Management", () => {
 *   const server = mockPluginServer();
 *   const registry = createRegistry(server, [
 *     // ...
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
  async getRepository(
    pluginId: string,
    options: { reload?: boolean } = {}
  ): Promise<PluginRepository> {
    return super.getRepository(pluginId, {
      ...options,
      // Do not reload. If this is true, it will fetch github.
      reload: false,
    });
  }
}
