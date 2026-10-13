import fs from "fs";
import path from "path";
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
import { PluginSystemError } from "@/lib/errors";
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

  describe("Default configuration", () => {
    const config = createConfig("");

    it("only fetches official entries", async () => {
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      const { official, community } = await manager.registry.getEntries();
      expect(official).toHaveLength(1);
      expect(official[0].id).toBe("official-plugin");
      expect(community).toHaveLength(0);
    });

    it("only installs official plugins", async () => {
      const manager = createPluginManager();
      manager.registerModule(ConfigurationModule.with({ config }));
      await manager.initialize();

      // Community plugins can not be installed
      await expect(manager.installPlugin("community-plugin")).rejects.toThrow();
      await expect(manager.getPlugins()).resolves.toHaveLength(0);

      // Official plugins can be installed
      await manager.installPlugin("official-plugin");
      await expect(manager.getPlugins()).resolves.toHaveLength(1);
    });

    it("only keeps official plugins enabled", async () => {
      // Install a plugin of every origin without the config module, then boot a
      // fresh manager with the defaults applied.
      const manager = createPluginManager();
      await manager.initialize();
      await manager.installPlugin("official-plugin");
      await manager.installPlugin("community-plugin");
      fs.cpSync(
        path.dirname(path.resolve(__dirname, "../../../fixtures/plugins/frozen-banana/manifest.json")),
        path.join(fileManager.options.pluginsDirectory, "frozen-banana"),
        { recursive: true }
      );

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
      const unlistedPlugin = plugins.find(
        (p) => p.manifest.id === "frozen-banana"
      );
      expect(officialPlugin.disableState).toStrictEqual({ disabled: false });
      expect(communityPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "community-plugins-disabled",
      });
      expect(unlistedPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "unlisted-plugins-disabled",
      });
    });
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
      const promise = manager.installPlugin("community-plugin");
      await expect(promise).rejects.toBeInstanceOf(PluginSystemError);
      await expect(promise).rejects.toHaveProperty("code", "PLUGIN_SYSTEM_DISABLED");
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
      disabled = false
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

  describe("Disable unlisted plugins", () => {
    const config = createConfig(`
      [pluginSystem]
      disabled = false
      communityDisabled = false
      unlistedDisabled = true
    `);

    it("can disable unlisted plugins", async () => {
      const manager = createPluginManager();
      await manager.initialize();
      await manager.installPlugin("official-plugin");
      await manager.installPlugin("community-plugin");
      fs.cpSync(
        path.dirname(path.resolve(__dirname, "../../../fixtures/plugins/frozen-banana/manifest.json")),
        path.join(fileManager.options.pluginsDirectory, "frozen-banana"),
        { recursive: true }
      );

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
      const unlistedPlugin = plugins.find(
        (p) => p.manifest.id === "frozen-banana"
      );
      expect(officialPlugin.disableState).toStrictEqual({ disabled: false });
      expect(communityPlugin.disableState).toStrictEqual({ disabled: false });
      expect(unlistedPlugin.disableState).toStrictEqual({
        disabled: true,
        reason: "unlisted-plugins-disabled",
      });
    });
  });
});
