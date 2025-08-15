import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { mockPluginServer } from "./utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "./utils/fileManagerHelpers";
import { createRegistry } from "./utils/registryHelpers";
import { NotSupportedPluginError } from "@commercial/backend/plugin-system/errors";
import { PluginSettings } from "@/services/plugin";

describe("Basic Plugin Management", () => {
  const server = mockPluginServer();
  const registry = createRegistry(server, [
    {
      id: "test-plugin",
      name: "Test Plugin",
      versions: [
        { version: "1.0.0", minAppVersion: "5.3.0" },
        { version: "1.0.1", minAppVersion: "5.3.0" },
        { version: "2.0.0", minAppVersion: "5.4.0" },
      ],
    },
  ]);

  let manager: PluginManager;
  let fileManager: PluginFileManager;
  let pluginSettings: PluginSettings;

  beforeEach(async () => {
    pluginSettings = {};
    fileManager = createFileManager();
    manager = new PluginManager({ fileManager, registry, appVersion: "9.9.9" });
    await manager.initialize({ pluginSettings });
  });

  afterEach(async () => {
    cleanFileManager(fileManager);
  });

  describe("Installing", () => {
    it("can install the latest plugins", async () => {
      await manager.installPlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].version).toBe("2.0.0");
    });

    it("can install the latest compatible plugins", async () => {
      const manager = new PluginManager({
        fileManager,
        registry,
        appVersion: "5.3.0",
      });
      await manager.initialize();
      await manager.installPlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();
      expect(plugins[0].version).toBe("1.0.1");
    });

    it("can install specific version of plugins", async () => {
      await manager.installPlugin("test-plugin", "1.0.1");
      const plugins = manager.getInstalledPlugins();
      expect(plugins[0].version).toBe("1.0.1");
    });

    it("can not install incompatible plugins", async () => {
      const manager = new PluginManager({
        fileManager,
        registry,
        appVersion: "5.3.0",
      });
      await manager.initialize();
      await expect(
        manager.installPlugin("test-plugin", "2.0.0")
      ).rejects.toThrow(NotSupportedPluginError);
    });
  });

  describe("Loading", () => {
    it("can load compatible plugins", async () => {
      await manager.installPlugin("test-plugin");
      expect(manager.getLoadablePlugins()).toHaveLength(1);
    });

    // When the user has downgraded their app, and before downgrading, they
    // installed a plugin
    it("can not load incompatible plugins", async () => {
      await manager.installPlugin("test-plugin");
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: "5.3.0",
      });
      await oldManager.initialize();
      expect(oldManager.getLoadablePlugins()).toHaveLength(0);
    });
  });

  describe("Updating", () => {
    it("can update plugins to the latest version", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      await manager.updatePlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();
      expect(plugins[0].version).toBe("2.0.0");
    });

    it("can update plugins to the latest compatible version", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: "5.3.0",
      });
      await oldManager.initialize();
      await oldManager.updatePlugin("test-plugin");
      const plugins = oldManager.getInstalledPlugins();
      expect(plugins[0].version).toBe("1.0.1");
    });

    it("can update plugins to a specific version", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      await manager.updatePlugin("test-plugin", "2.0.0");
      const plugins = manager.getInstalledPlugins();
      expect(plugins[0].version).toBe("2.0.0");
    });

    it.only("can not update plugins to a specific incompatible version", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: "5.3.0",
      });
      await oldManager.initialize();
      await expect(
        oldManager.updatePlugin("test-plugin", "2.0.0")
      ).rejects.toThrow(NotSupportedPluginError);
    });
  });

  describe("Uninstalling", () => {
    it("can uninstall plugins", async () => {
      await manager.installPlugin("test-plugin");
      await manager.uninstallPlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();
      expect(plugins).toHaveLength(0);
    });
  });
});
