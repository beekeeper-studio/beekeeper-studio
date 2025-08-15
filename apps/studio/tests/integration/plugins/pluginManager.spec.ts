import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { mockPluginServer } from "./utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "./utils/fileManagerHelpers";
import { createRegistry } from "./utils/registryHelpers";
import {
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@commercial/backend/plugin-system/errors";
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
  const APP_VERSION_SUPPORTS_ALL = "9.9.9";
  const APP_VERSION_SUPPORTS_PARTIAL = "5.3.0";
  const APP_VERSION_SUPPORTS_NONE = "5.2.0";

  let manager: PluginManager;
  let fileManager: PluginFileManager;
  let pluginSettings: PluginSettings;

  beforeEach(async () => {
    pluginSettings = {};
    fileManager = createFileManager();
    manager = new PluginManager({
      fileManager,
      registry,
      appVersion: APP_VERSION_SUPPORTS_ALL,
      installDefaults: { autoUpdate: false },
    });
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
        appVersion: APP_VERSION_SUPPORTS_PARTIAL,
        installDefaults: { autoUpdate: false },
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

    it("can not install specific incompatible plugins", async () => {
      const manager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_PARTIAL,
        installDefaults: { autoUpdate: false },
      });
      await manager.initialize();
      await expect(
        manager.installPlugin("test-plugin", "2.0.0")
      ).rejects.toThrow(NotSupportedPluginError);
    });

    it("can not install any incompatible plugins", async () => {
      const manager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_NONE,
        installDefaults: { autoUpdate: false },
      });
      await manager.initialize();
      await expect(manager.installPlugin("test-plugin")).rejects.toThrow(
        NotSupportedPluginError
      );
    });

    it("can not install nonexistent plugins", async () => {
      await expect(manager.installPlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
    });
  });

  describe("Loading", () => {
    it("can load compatible plugins", async () => {
      await manager.installPlugin("test-plugin", "2.0.0");
      expect(manager.getLoadablePlugins()).toHaveLength(1);
    });

    // Simulates a user who installed a plugin, then downgraded the app.
    // The downgraded app version should not load incompatible plugins.
    it("can not load incompatible plugins", async () => {
      await manager.installPlugin("test-plugin", "2.0.0");
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_PARTIAL,
        installDefaults: { autoUpdate: false },
      });
      await oldManager.initialize();
      expect(oldManager.getLoadablePlugins()).toHaveLength(0);
    });
  });

  describe("Updating", () => {
    it("can update plugins automatically on start", async () => {
      let pluginSettings = {};
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_ALL,
        installDefaults: { autoUpdate: true }, // important!
        onPluginSettingsChange(newPluginSettings) {
          // important!
          pluginSettings = newPluginSettings;
        },
      });
      await oldManager.initialize({ pluginSettings });
      await oldManager.installPlugin("test-plugin", "1.0.0");

      await manager.reinitialize({ pluginSettings }); // It should update right here
      const plugins = manager.getInstalledPlugins();

      expect(plugins[0].version).toBe("2.0.0");
    });

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
        appVersion: APP_VERSION_SUPPORTS_PARTIAL,
        installDefaults: { autoUpdate: false },
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

    it("can not update plugins to a specific incompatible version", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_PARTIAL,
        installDefaults: { autoUpdate: false },
      });
      await oldManager.initialize();
      await expect(
        oldManager.updatePlugin("test-plugin", "2.0.0")
      ).rejects.toThrow(NotSupportedPluginError);
    });

    it("can not update uninstalled plugins", async () => {
      await expect(manager.updatePlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
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
