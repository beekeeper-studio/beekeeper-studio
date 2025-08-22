import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager, {
  PluginManagerInitializeOptions,
  PluginManagerOptions,
} from "@/services/plugin/PluginManager";
import { createPluginServer } from "./utils/server";
import { createFileManager, cleanFileManager } from "./utils/fileManager";
import { MockPluginRepositoryService } from "./utils/registry";
import {
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@commercial/backend/plugin-system/errors";
import PluginRegistry from "@/services/plugin/PluginRegistry";

describe("Basic Plugin Management", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  const registry = new PluginRegistry(repositoryService);

  enum AppVer {
    COMPAT = "5.4.0",
    INCOMPAT = "5.3.0",
  }

  let fileManager: PluginFileManager;

  async function initPluginManager(
    appVersionOrOptions:
      | AppVer
      | (Partial<PluginManagerOptions> & { appVersion: AppVer }),
    initializeOptions?: Partial<PluginManagerInitializeOptions>
  ) {
    const options: PluginManagerOptions = {
      fileManager:
        typeof appVersionOrOptions === "string"
          ? fileManager
          : appVersionOrOptions.fileManager || fileManager,
      registry:
        typeof appVersionOrOptions === "string"
          ? registry
          : appVersionOrOptions.registry || registry,
      appVersion:
        typeof appVersionOrOptions === "string"
          ? appVersionOrOptions
          : appVersionOrOptions.appVersion,
      installDefaults:
        typeof appVersionOrOptions === "string"
          ? { autoUpdate: false }
          : {
            autoUpdate: false,
            ...appVersionOrOptions.installDefaults,
          },
      onPluginSettingsChange:
        typeof appVersionOrOptions === "string"
          ? undefined
          : appVersionOrOptions.onPluginSettingsChange,
    };
    const manager = new PluginManager(options);
    await manager.initialize(initializeOptions);
    return manager;
  }

  beforeEach(() => {
    repositoryService.plugins = [
      {
        id: "test-plugin",
        name: "Test Plugin",
        latestRelease: { version: "1.0.0", minAppVersion: AppVer.COMPAT },
        readme: "# Test Plugin\n\nThis is a test plugin.",
      },
      {
        id: "frozen-banana",
        name: "Frozen Banana",
        latestRelease: { version: "1.0.0", minAppVersion: AppVer.COMPAT },
        readme: "# Frozen Banana\n\nThis is a frozen banana.",
      },
    ];
    registry.clearCache();
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Listing", () => {
    it("can list plugin entries", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      const entries = await manager.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe("test-plugin");
      expect(entries[1].id).toBe("frozen-banana");
    });

    it("can get plugin details (versions, readme, etc..)", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await expect(manager.getRepository("test-plugin")).resolves.toStrictEqual(
        {
          latestRelease: {
            manifest: {
              id: "test-plugin",
              name: "Test Plugin",
              author: "test-plugin-author",
              version: "1.0.0",
              minAppVersion: "5.4.0",
              description: "Test Plugin description",
              capabilities: {
                views: [],
              },
            },
            sourceArchiveUrl: server.formatUrl({
              version: "1.0.0",
              minAppVersion: "5.4.0",
            }),
          },
          readme: "# Test Plugin\n\nThis is a test plugin.",
        }
      );
    });
  });

  describe("Installing", () => {
    it("can install the latest plugins if compatible", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].version).toBe("1.0.0");
    });

    it("can not install the latest plugins if not compatible", async () => {
      const manager = await initPluginManager(AppVer.INCOMPAT);
      await expect(manager.installPlugin("test-plugin")).rejects.toThrow(
        NotSupportedPluginError
      );
    });

    it("can not install nonexistent plugins", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await expect(manager.installPlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
    });
  });

  describe("Loading", () => {
    it("can load compatible plugins", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");
      expect(manager.getLoadablePlugins()).toHaveLength(1);
    });

    // Simulates a user who installed a plugin, then downgraded the app.
    // The downgraded app version should not load incompatible plugins.
    it("can not load incompatible plugins", async () => {
      // 1. Setup a compatible app
      const manager = await initPluginManager(AppVer.COMPAT);

      // 2. Install a plugin
      await manager.installPlugin("test-plugin");

      // 3. Simulate a downgraded app
      const oldManager = await initPluginManager(AppVer.INCOMPAT);

      // 4. The downgraded app should not load incompatible plugins
      expect(oldManager.getLoadablePlugins()).toHaveLength(0);
    });
  });

  describe("Updating", () => {
    it("can check for updates", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // The plugin is already up to date
      expect(await manager.checkForUpdates("test-plugin")).toBe(false);

      // Simulate plugin update on the server
      repositoryService.plugins[0].latestRelease.version = "1.2.0";

      // The plugin is now outdated
      expect(manager.checkForUpdates("test-plugin")).resolves.toBe(true);
    });

    it("can update plugins automatically on start", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      repositoryService.plugins[0].latestRelease.version = "1.2.0";

      // Simulate app restart
      const manager2 = await initPluginManager(AppVer.COMPAT, {
        pluginSettings: {
          "test-plugin": {
            autoUpdate: true,
          },
        },
      });
      expect(manager2.getInstalledPlugins()[0].version).toBe("1.2.0");
    });

    it("can update plugins manually", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      repositoryService.plugins[0].latestRelease.version = "1.2.0";

      await manager.updatePlugin("test-plugin");
      expect(manager.getInstalledPlugins()[0].version).toBe("1.2.0");
    });

    it("can not update plugins if not compatible", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      repositoryService.plugins[0].latestRelease = {
        version: "1.2.0",
        minAppVersion: "9.9.0",
      };

      await expect(manager.updatePlugin("test-plugin")).rejects.toThrow(
        NotSupportedPluginError
      );
    });

    it("can not update nonexistent plugins", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await expect(manager.updatePlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
    });
  });

  describe("Uninstalling", () => {
    it("can uninstall plugins", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");
      await manager.uninstallPlugin("test-plugin");
      expect(manager.getInstalledPlugins()).toHaveLength(0);
    });
  });
});
