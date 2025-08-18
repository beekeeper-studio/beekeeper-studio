import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "./utils/server";
import { createFileManager, cleanFileManager } from "./utils/fileManager";
import { createRegistry } from "./utils/registry";
import {
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@commercial/backend/plugin-system/errors";

describe("Basic Plugin Management", () => {
  const server = createPluginServer();
  const registry = createRegistry(server, [
    {
      id: "test-plugin",
      name: "Test Plugin",
      releases: [
        { version: "1.0.0", minAppVersion: "5.3.0" },
        { version: "1.0.1", minAppVersion: "5.3.0" },
        { version: "2.0.0", minAppVersion: "5.4.0" },
      ],
      versions: {
        ">=2.0.0": ">=5.4.0",
      },
      readme: "# Test Plugin\n\nThis is a test plugin.",
    },
    {
      id: "frozen-banana",
      name: "Frozen Banana",
      releases: [
        { version: "1.0.0", minAppVersion: "5.3.0" },
        { version: "2.0.0", minAppVersion: "5.4.0" },
      ],
      readme: "# Frozen Banana\n\nThis is a frozen banana.",
    },
  ]);
  const APP_VERSION_SUPPORTS_ALL = "9.9.9";
  const APP_VERSION_SUPPORTS_PARTIAL = "5.3.0";
  const APP_VERSION_SUPPORTS_NONE = "5.2.0";

  let manager: PluginManager;
  let fileManager: PluginFileManager;

  beforeEach(async () => {
    fileManager = createFileManager();
    manager = new PluginManager({
      fileManager,
      registry,
      appVersion: APP_VERSION_SUPPORTS_ALL,
      installDefaults: { autoUpdate: false },
    });
    await manager.initialize();
  });

  afterEach(async () => {
    cleanFileManager(fileManager);
  });

  it("can list plugin entries", async () => {
    const entries = await manager.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("test-plugin");
    expect(entries[1].id).toBe("frozen-banana");
  });

  it("can get plugin details (versions, readme, etc..)", async () => {
    await expect(manager.getRepository("test-plugin")).resolves.toStrictEqual({
      releases: [
        {
          version: "1.0.0",
          beta: false,
          sourceArchiveUrl: server.formatUrl({
            version: "1.0.0",
            minAppVersion: "5.3.0",
          }),
        },
        {
          version: "1.0.1",
          beta: false,
          sourceArchiveUrl: server.formatUrl({
            version: "1.0.1",
            minAppVersion: "5.3.0",
          }),
        },
        {
          version: "2.0.0",
          beta: false,
          sourceArchiveUrl: server.formatUrl({
            version: "2.0.0",
            minAppVersion: "5.4.0",
          }),
        },
      ],
      readme: "# Test Plugin\n\nThis is a test plugin.",
    });
  });

  describe.skip("Installing", () => {
    it.only("can install the latest plugins", async () => {
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
    it("can check for updates", async () => {
      await manager.installPlugin("test-plugin", "1.0.0");
      expect(await manager.checkForUpdates("test-plugin")).toBe(true);

      // Simulates a user who installed a plugin, then downgraded the app.
      const oldManager = new PluginManager({
        fileManager,
        registry,
        appVersion: APP_VERSION_SUPPORTS_NONE,
        installDefaults: { autoUpdate: false },
      });
      await oldManager.initialize();
      expect(await oldManager.checkForUpdates("test-plugin")).toBe(false);
    });

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
