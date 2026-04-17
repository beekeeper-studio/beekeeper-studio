import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "@tests/integration/plugins/utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "@tests/integration/plugins/utils/fileManager";
import { MockPluginRepositoryService } from "@tests/integration/plugins/utils/registry";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { ConfigurationModule } from "@commercial/backend/plugin-system/modules";
import { PluginSystemDisabledError } from "@/services/plugin/errors";
import { createConfig } from "@tests/integration/utils/config";

describe("Plugin Configuration Module", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  repositoryService.plugins = [
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
      allow[] = official-plugin
    `);

    it("can prevent network activity", async () => {
      const fetchSpy = jest.spyOn(repositoryService, "mockFetch");
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      await expect(manager.registry.getEntries()).resolves.toStrictEqual({
        official: [],
        community: [],
      });
      await expect(manager.installPlugin("official-plugin")).rejects.toThrow();
      await expect(manager.installPlugin("community-plugin")).rejects.toThrow(
        PluginSystemDisabledError
      );
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("can disable disallowed plugins", async () => {
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
        reason: "plugin-system-disabled",
      });
    });
  });

  describe("Disable community plugins", () => {
    const config = createConfig(`
      [pluginSystem]
      communityDisabled = true
    `);

    it("can prevent fetching community entries", async () => {
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      const { official, community } = await manager.registry.getEntries();
      expect(official).toHaveLength(1);
      expect(official[0].id).toBe("official-plugin");
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
