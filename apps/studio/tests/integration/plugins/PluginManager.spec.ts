import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager, {
  PluginManagerOptions,
} from "@/services/plugin/PluginManager";
import { createPluginServer } from "./utils/server";
import { createFileManager, cleanFileManager } from "./utils/fileManager";
import { MockPluginRepositoryService } from "./utils/registry";
import {
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@/services/plugin/errors";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { Manifest } from "@/services/plugin";
import { UserSetting } from "@/common/appdb/models/user_setting";

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
      | (Partial<PluginManagerOptions> & { appVersion: AppVer })
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
    };

    const manager = new PluginManager(options);
    await manager.initialize();
    return manager;
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
    repositoryService.plugins = [
      {
        id: "test-plugin",
        name: "Test Plugin",
        latestRelease: { version: "1.0.0", minAppVersion: AppVer.COMPAT },
        readme: "# Test Plugin\n\nThis is a test plugin.",
        origin: "official",
      },
      {
        id: "frozen-banana",
        name: "Frozen Banana",
        latestRelease: { version: "1.0.0", minAppVersion: AppVer.COMPAT },
        readme: "# Frozen Banana\n\nThis is a frozen banana.",
        origin: "official",
      },
      {
        id: "watermelon-sticker",
        name: "Watermelon Sticker",
        latestRelease: { version: "1.0.0" },
        readme: "# Watermelon Sticker\n\nThe sticker for watermelons.",
        origin: "community",
      },
    ];
    registry.clearCache();
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Discovery", () => {
    it("can list plugin entries", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      const { official, community } = await manager.registry.getEntries();
      expect(official).toHaveLength(2);
      expect(official[0].id).toBe("test-plugin");
      expect(official[1].id).toBe("frozen-banana");
      expect(community).toHaveLength(1);
      expect(community[0].id).toBe("watermelon-sticker");
    });

    it("can get plugin details (versions, readme, etc..)", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      const manifest: Manifest = {
        id: "test-plugin",
        name: "Test Plugin",
        version: "1.0.0",
        minAppVersion: "5.4.0",
        author: "test-plugin-author",
        description: "Test Plugin description",
        capabilities: {
          views: [],
        },
      };
      await expect(manager.getRepository("test-plugin")).resolves.toStrictEqual(
        {
          latestRelease: {
            manifest,
            sourceArchiveUrl: server.formatUrl(manifest),
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
      const plugins = manager.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest.version).toBe("1.0.0");
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
      expect(manager.getPlugins()[0]).toHaveProperty("loadable", true);

      await manager.installPlugin("watermelon-sticker");
      expect(manager.getPlugins()[1]).toHaveProperty("loadable", true);
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
      expect(oldManager.getPlugins()[0]).toHaveProperty("loadable", false);
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
      await manager.installPlugin("frozen-banana");

      expect(manager.pluginSettings).toStrictEqual({
        "test-plugin": { autoUpdate: true },
        "frozen-banana": { autoUpdate: true },
      });

      // Simulate plugin updates on the server
      repositoryService.plugins[0].latestRelease.version = "1.2.0";
      repositoryService.plugins[1].latestRelease.version = "1.3.0";

      // Simulate app restart
      const manager2 = await initPluginManager(AppVer.COMPAT);
      expect(
        manager2
          .getPlugins()
          .find(({ manifest }) => manifest.id === "test-plugin").manifest
          .version
      ).toBe("1.2.0");
      expect(
        manager2
          .getPlugins()
          .find(({ manifest }) => manifest.id === "frozen-banana").manifest
          .version
      ).toBe("1.3.0");
    });

    it("can update plugins manually", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      repositoryService.plugins[0].latestRelease.version = "1.2.0";

      await manager.updatePlugin("test-plugin");
      expect(manager.getPlugins()[0].manifest.version).toBe("1.2.0");
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
      expect(manager.getPlugins()).toHaveLength(0);
    });
  });
});
