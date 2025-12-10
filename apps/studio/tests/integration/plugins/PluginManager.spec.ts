import PluginManager, {
  PluginManagerOptions,
} from "@/services/plugin/PluginManager";
import { createPluginServer } from "./utils/server";
import { createFileManager, cleanFileManager } from "./utils/fileManager";
import { MockPluginRepositoryService } from "./utils/registry";
import {
  ForbiddenPluginError,
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@/services/plugin/errors";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { Manifest } from "@/services/plugin";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import bindLicenseInstallLimits from "@commercial/backend/plugin-system/licenseInstallLimits";
import { createLicense } from "@tests/utils";

function preparePluginSystemTestGroup() {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  const registry = new PluginRegistry(repositoryService);
  const fileManager = createFileManager();

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
    PluginManager.PREINSTALLED_PLUGINS = [];
    const setting = await UserSetting.findOneBy({ key: "pluginSettings" });
    setting.userValue = "{}";
    await setting.save();
    registry.clearCache();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  return {
    fileManager,
    server,
    registry,
    repositoryService,
  };
}

describe("Basic Plugin Management", () => {
  const {
    fileManager,
    server,
    registry,
    repositoryService,
  } = preparePluginSystemTestGroup();

  enum AppVer {
    COMPAT = "5.4.0",
    INCOMPAT = "5.3.0",
  }

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
      {
        id: "watermelon-sticker",
        name: "Watermelon Sticker",
        latestRelease: { version: "1.0.0" },
        readme: "# Watermelon Sticker\n\nThe sticker for watermelons.",
      },
    ];
  });

  describe("Discovery", () => {
    it("can list plugin entries", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      const entries = await manager.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].id).toBe("test-plugin");
      expect(entries[1].id).toBe("frozen-banana");
      expect(entries[2].id).toBe("watermelon-sticker");
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
        manifestVersion: 1,
        capabilities: {
          views: [],
          menu: [],
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

    it("can preinstall plugins", async () => {
      PluginManager.PREINSTALLED_PLUGINS = ["test-plugin", "frozen-banana"];
      const manager = await initPluginManager(AppVer.COMPAT);
      expect(manager.getPlugins()).toHaveLength(2);
      expect(manager.getPlugins()[0].manifest.id).toBe("test-plugin");
      expect(manager.getPlugins()[1].manifest.id).toBe("frozen-banana");
    })
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

describe("Plugin System Constraint", () => {
  const {
    repositoryService,
    fileManager,
    registry,
  } = preparePluginSystemTestGroup();

  let manager: PluginManager;

  beforeEach(async () => {
    // This creates a list of plugin ids:
    // [
    //   { id: "bks-plugin-1" },
    //   { id: "bks-plugin-2" },
    //   ....
    //   { id: "community-plugin-1" },
    //   { id: "community-plugin-2" },
    //   ...
    // ]
    //
    // NOTE:
    // - Plugins that start with "bks-" are core plugins
    // - Plugins that does NOT start with "bks-" are community plugins
    repositoryService.plugins = [
      ...(new Array(6).fill(null).map((_0, i) => ({ id: `bks-plugin-${i + 1}` }))),
      ...(new Array(6).fill(null).map((_0, i) => ({ id: `community-plugin-${i + 1}` }))),
    ];
    manager = new PluginManager({ appVersion: "9.9.9", fileManager, registry });
    await manager.initialize();
    await LicenseKey.clear();
  });

  it("free users get 2 community plugins", async () => {
    bindLicenseInstallLimits(manager, await LicenseKey.getLicenseStatus());

    // Can't install any core plugins
    await expect(manager.installPlugin("bks-plugin-1")).rejects.toThrow(
      ForbiddenPluginError
    );

    await manager.installPlugin("community-plugin-1");
    await manager.installPlugin("community-plugin-2");

    // As long as there are no errors, we're happy as can be
    expect.anything();

    await expect(manager.installPlugin("community-plugin-3")).rejects.toThrow(
      ForbiddenPluginError
    );

    await manager.uninstallPlugin("community-plugin-2");

    // Should be able to install the third plugin since we only have one now
    await manager.installPlugin("community-plugin-3");

    expect.anything();
  });

  it("indie users get 5 plugins (core + community <= 5)", async () => {
    await createLicense({ licenseType: "PersonalLicense" }),
    bindLicenseInstallLimits(manager, await LicenseKey.getLicenseStatus());

    await manager.installPlugin("community-plugin-1");
    await manager.installPlugin("community-plugin-2");
    await manager.installPlugin("community-plugin-3");
    await manager.installPlugin("community-plugin-4");
    await manager.installPlugin("community-plugin-5");

    // No problem installing 5 community plugins
    expect.anything();

    // But we can't install any more
    await expect(manager.installPlugin("community-plugin-6")).rejects.toThrow(
      ForbiddenPluginError
    );
    await expect(manager.installPlugin("bks-plugin-1")).rejects.toThrow(
      ForbiddenPluginError
    );

    await manager.uninstallPlugin("community-plugin-5");

    // We now have 4 plugins, installing the 6th one should work
    await manager.installPlugin("community-plugin-6");

    // Remove some plugins so we can try installing the core plugins
    await manager.uninstallPlugin("community-plugin-3");
    await manager.uninstallPlugin("community-plugin-4");
    await manager.uninstallPlugin("community-plugin-6");

    // We now have 2 plugins. We have 3 free slots.
    await manager.installPlugin("bks-plugin-1");
    await manager.installPlugin("bks-plugin-2");
    await manager.installPlugin("bks-plugin-3");

    // :-D
    expect.anything();

    // We can't install any more
    await expect(manager.installPlugin("bks-plugin-4")).rejects.toThrow(
      ForbiddenPluginError
    );
  });

  it("pro+ users get unlimited plugins", async () => {
    await createLicense({ licenseType: "BusinessLicense" }),
    bindLicenseInstallLimits(manager, await LicenseKey.getLicenseStatus());

    await manager.installPlugin("bks-plugin-1");
    await manager.installPlugin("bks-plugin-2");
    await manager.installPlugin("bks-plugin-3");
    await manager.installPlugin("bks-plugin-4");
    await manager.installPlugin("bks-plugin-5");
    await manager.installPlugin("bks-plugin-6");
    await manager.installPlugin("community-plugin-1");
    await manager.installPlugin("community-plugin-2");
    await manager.installPlugin("community-plugin-3");
    await manager.installPlugin("community-plugin-4");
    await manager.installPlugin("community-plugin-5");
    await manager.installPlugin("community-plugin-6");

    expect.anything();
  });
})
