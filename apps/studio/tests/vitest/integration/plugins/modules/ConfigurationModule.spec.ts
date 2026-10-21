import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "@tests/vitest/integration/plugins/utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "@tests/vitest/integration/plugins/utils/fileManager";
import { MockPluginRepositoryService } from "@tests/vitest/integration/plugins/utils/registry";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { ConfigurationModule } from "@commercial/backend/plugin-system/modules";
import { PluginSystemError } from "@/lib/errors";
import { createConfig } from "@tests/integration/utils/config";
import globals from "@/common/globals";

// Bundled plugins are the only ones allowed when the plugin system is disabled
const bundledPluginId = globals.plugins.ensureInstalled[0].id;

describe("Plugin Configuration Module", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  repositoryService.plugins = [
    {
      id: bundledPluginId,
      name: "Bundled Plugin",
      latestRelease: { version: "1.0.0", minAppVersion: "9.9.9" },
      readme: "# Bundled Plugin\n\nThis is a bundled plugin.",
      origin: "official",
    },
    {
      id: "official-plugin",
      name: "Official Plugin",
      latestRelease: { version: "1.0.0", minAppVersion: "9.9.9" },
      readme: "# Official Plugin\n\nThis is an official plugin.",
      origin: "official",
    },
    {
      id: "community-plugin",
      name: "Community Plugin",
      latestRelease: { version: "1.0.0", minAppVersion: "9.9.9" },
      readme: "# Community Plugin\n\nThis is a community plugin.",
      origin: "community",
    },
  ];

  let registry: PluginRegistry;
  let fileManager: PluginFileManager;

  function createPluginManager() {
    return new PluginManager({ fileManager, registry, appVersion: "9.9.9" });
  }

  beforeAll(async () => {
    await TestOrmConnection.connect();
    const runner = TestOrmConnection.connection.connection.createQueryRunner();
    await migration.testRun(runner);
    await runner.release();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    const setting = await UserSetting.findOneBy({ key: "pluginSettings" });
    setting.userValue = "{}";
    await setting.save();
    registry = new PluginRegistry(repositoryService);
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Disable plugin system", () => {
    const config = createConfig(`
      [pluginSystem]
      disabled = true
    `);

    it("can prevent network activity", async () => {
      const fetchSpy = vi.spyOn(repositoryService, "mockFetch");
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      await expect(manager.registry.getEntries()).resolves.toStrictEqual({
        official: [],
        community: [],
      });
      await expect(manager.installPlugin("official-plugin")).rejects.toThrow();
      const promise = manager.installPlugin("community-plugin");
      await expect(promise).rejects.toBeInstanceOf(PluginSystemError);
      await expect(promise).rejects.toHaveProperty("code", "PLUGIN_SYSTEM_DISABLED");
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("can disable non-bundled plugins", async () => {
      const manager = createPluginManager();
      await manager.initialize();
      await manager.installPlugin(bundledPluginId);
      await manager.installPlugin("official-plugin");
      await manager.installPlugin("community-plugin");

      const manager2 = createPluginManager();
      manager2.registerModule(ConfigurationModule.with({ config }));
      await manager2.initialize();

      const plugins = await manager2.getPlugins();
      const bundledPlugin = plugins.find(
        (p) => p.manifest.id === bundledPluginId
      );
      const officialPlugin = plugins.find(
        (p) => p.manifest.id === "official-plugin"
      );
      const communityPlugin = plugins.find(
        (p) => p.manifest.id === "community-plugin"
      );
      expect(bundledPlugin.disableState).toStrictEqual({ disabled: false });
      expect(officialPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "plugin-system-disabled",
      });
      expect(communityPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "plugin-system-disabled",
      });
    });
  });

  describe("Disable community plugins", () => {
    const config = createConfig(`
      [pluginSystem]
      disabled = false
      officialDisabled = false
      communityDisabled = true
    `);

    it("can prevent fetching community entries", async () => {
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      const { official, community } = await manager.registry.getEntries();
      expect(official.map((e) => e.id)).toStrictEqual([
        bundledPluginId,
        "official-plugin",
      ]);
      expect(community).toHaveLength(0);
    });

    it("can not install community plugins", async () => {
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      // Can not install community plugins
      await expect(manager.installPlugin("community-plugin")).rejects.toThrow();
      await expect(manager.getPlugins()).resolves.toHaveLength(0);

      // Can still install official plugins
      await manager.installPlugin("official-plugin");
      await expect(manager.getPlugins()).resolves.toHaveLength(1);
    });

    it("can disable installed community plugins", async () => {
      const manager = createPluginManager();
      await manager.initialize();
      await manager.installPlugin("official-plugin");
      await manager.installPlugin("community-plugin");

      const manager2 = createPluginManager();
      manager2.registerModule(ConfigurationModule.with({ config }));
      await manager2.initialize();

      const plugins = await manager2.getPlugins();
      const officialPlugin = plugins.find(
        (p) => p.manifest.id === "official-plugin"
      );
      const communityPlugin = plugins.find(
        (p) => p.manifest.id === "community-plugin"
      );
      expect(officialPlugin.disableState).toStrictEqual({ disabled: false });
      expect(communityPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "community-plugins-disabled",
      });
    });
  });
});
