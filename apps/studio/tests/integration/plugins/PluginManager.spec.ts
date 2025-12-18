import PluginManager, {
  PluginManagerOptions,
} from "@/services/plugin/PluginManager";
import { preloadPlugins } from "./utils/fileManager";
import {
  ForbiddenPluginError,
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@/services/plugin/errors";
import { Manifest } from "@/services/plugin";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import bindLicenseConstraints from "@commercial/backend/plugin-system/licenseConstraints";
import { createLicense } from "@tests/utils";
import preparePluginSystemTestGroup from "./utils/preparePluginSystem";

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
    repositoryService.setPluginsJson([
      { id: "test-plugin" },
      { id: "frozen-banana" },
      { id: "watermelon-sticker" },
    ]);
    repositoryService.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: AppVer.COMPAT });
    repositoryService.setLatestRelease({ id: "frozen-banana", version: "1.0.0", minAppVersion: AppVer.COMPAT });
    repositoryService.setLatestRelease({ id: "watermelon-sticker", version: "1.0.0", minAppVersion: "5.0.0" });
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
        author: "Test Plugin Author",
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
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: AppVer.COMPAT });

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
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: AppVer.COMPAT });
      repositoryService.setLatestRelease({ id: "frozen-banana", version: "1.3.0", minAppVersion: AppVer.COMPAT });

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
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: AppVer.COMPAT });

      await manager.updatePlugin("test-plugin");
      expect(manager.getPlugins()[0].manifest.version).toBe("1.2.0");
    });

    it("can not update plugins if not compatible", async () => {
      const manager = await initPluginManager(AppVer.COMPAT);
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: "9.9.0" });

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

describe("Plugin License Constraints", () => {
  describe("Installation", () => {
    const {
      repositoryService,
      fileManager,
      registry,
    } = preparePluginSystemTestGroup();

    let manager: PluginManager;

    beforeEach(async () => {
      // This creates a list of core and community plugins
      repositoryService.setPluginsJson([
        { id: "bks-ai-shell", community: false },
        { id: "bks-er-diagram", community: false },
        ...(new Array(6).fill(null).map((_0, i) => ({ id: `bks-plugin-${i + 1}`, community: false }))),
        ...(new Array(6).fill(null).map((_0, i) => ({ id: `community-plugin-${i + 1}`, community: true }))),
      ]);
      manager = new PluginManager({ appVersion: "9.9.9", fileManager, registry });
      await manager.initialize();
      await LicenseKey.clear();
    });

    it("free users - get 2 community plugins", async () => {
      // install some core plugins before binding license constraints
      await manager.installPlugin("bks-ai-shell");
      await manager.installPlugin("bks-er-diagram");

      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());

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

    it("indie users - get 5 plugins (core + community <= 5)", async () => {
      await createLicense({ licenseType: "PersonalLicense" });
      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());

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

    it("pro+ users - get unlimited plugins", async () => {
      await createLicense({ licenseType: "BusinessLicense" });
      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());

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
  });

  describe("Activation", () => {
    const { fileManager, registry } = preparePluginSystemTestGroup();

    let manager: PluginManager;

    beforeEach(async () => {
      manager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
      preloadPlugins(fileManager, [
        { id: "bks-plugin-0" },
        { id: "bks-plugin-1" },
        { id: "community-plugin-0" },
        { id: "community-plugin-1" },
        { id: "community-plugin-2" },
        { id: "community-plugin-3" },
      ]);
    });

    it("free users - pick the first 2 community plugins and disable the rest", async () => {
      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());
      await manager.initialize();
      const map = manager.getPlugins().reduce((obj, plugin) => ({ ...obj, [plugin.manifest.id]: plugin.disabled }), {});
      expect(map).toStrictEqual({
        "bks-plugin-0": true,
        "bks-plugin-1": true,
        "community-plugin-0": false,
        "community-plugin-1": false,
        "community-plugin-2": true,
        "community-plugin-3": true,
      });
    });

    it("indie users - pick the first 5 plugins and disable the rest", async () => {
      await createLicense({ licenseType: "PersonalLicense" });
      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());
      await manager.initialize();

      const map = manager.getPlugins().reduce((obj, plugin) => ({ ...obj, [plugin.manifest.id]: plugin.disabled }), {});
      expect(map).toStrictEqual({
        "bks-plugin-0": false,
        "bks-plugin-1": false,
        "community-plugin-0": false,
        "community-plugin-1": false,
        "community-plugin-2": false,
        "community-plugin-3": true,
      });
    });

    it("pro+ users - get unlimited plugins", async () => {
      await createLicense({ licenseType: "BusinessLicense" });
      bindLicenseConstraints(manager, await LicenseKey.getLicenseStatus());
      await manager.initialize();

      const map = manager.getPlugins().reduce((obj, plugin) => ({ ...obj, [plugin.manifest.id]: plugin.disabled }), {});
      expect(map).toStrictEqual({
        "bks-plugin-0": false,
        "bks-plugin-1": false,
        "community-plugin-0": false,
        "community-plugin-1": false,
        "community-plugin-2": false,
        "community-plugin-3": false,
      });
    });
  });
});

describe("Disabling plugins via config.ini", () => {
  const {
    fileManager,
    registry,
    repositoryService,
  } = preparePluginSystemTestGroup();

  const pluginSettings = {
    "community-plugin-0": { disabled: true },
  } as const;

  beforeEach(() => {
    repositoryService.setPluginsJson([
      { id: "community-plugin-0" },
      { id: "community-plugin-1" },
    ]);
  });

  it("can force-disable installed plugins", async () => {
    const manager = new PluginManager({
      pluginSettings,
      appVersion: "9.9.9",
      registry,
      fileManager,
    });
    await manager.initialize();
    await manager.installPlugin("community-plugin-0");
    expect(manager.getPlugins()[0].disabled).toBe(true);

    // Only disable disabled plugins
    await manager.installPlugin("community-plugin-1");
    expect(manager.getPlugins()[1].disabled).toBe(false);
  });

  it("can force-disable preloaded plugins", async () => {
    preloadPlugins(fileManager, [
      { id: "community-plugin-0" },
      { id: "community-plugin-1" },
    ]);

    const manager = new PluginManager({
      pluginSettings,
      appVersion: "9.9.9",
      registry,
      fileManager,
    });
    await manager.initialize();

    expect(manager.getPlugins()[0].disabled).toBe(true);
    expect(manager.getPlugins()[1].disabled).toBe(false);
  });
});

