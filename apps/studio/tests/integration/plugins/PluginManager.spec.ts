import PluginManager from "@/services/plugin/PluginManager";
import { preloadPlugins } from "./utils/fileManager";
import {
  ForbiddenPluginError,
  NotFoundPluginError,
  NotSupportedPluginError,
} from "@/services/plugin/errors";
import { Manifest } from "@/services/plugin";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import bindLicenseConstraints from "@commercial/backend/plugin-system/hooks/licenseConstraints";
import bindIniConfig from "@commercial/backend/plugin-system/hooks/iniConfig";
import { createLicense } from "@tests/utils";
import preparePluginSystemTestGroup from "./utils/preparePluginSystem";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginRepositoryService } from "./utils/registry";

describe("Basic Plugin Management", () => {
  const { server, fileManager } = preparePluginSystemTestGroup();

  let registry: PluginRegistry;

  beforeAll(() => {
    const repositoryService = new MockPluginRepositoryService(server);
    repositoryService.setPluginsJson('core', [
      { id: "test-plugin" },
      { id: "frozen-banana" },
    ]);
    repositoryService.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: "5.4.0" });
    repositoryService.setLatestRelease({ id: "frozen-banana", version: "1.0.0", minAppVersion: "5.4.0" });
    registry = new PluginRegistry(repositoryService);
  });

  describe("Initialization", () => {
    it("does not need internet connection to work", async () => {
      const faultyService = new PluginRepositoryService({
        octokitOptions: {
          request: {
            fetch: jest.fn(() => {
              throw new Error("Network error");
            }),
          },
        },
      });
      const initialRegistryFallback = jest.fn(() => Promise.resolve([]));
      const manager = new PluginManager({
        appVersion: "9.9.9",
        fileManager,
        registry: new PluginRegistry(faultyService),
        initialRegistryFallback,
      });
      await expect(manager.initialize()).resolves.not.toThrow();
      expect(initialRegistryFallback).toHaveBeenCalledTimes(1);
    });

    it("should work with unpublished plugins (the installed plugins are not in the plugins.json)", async () => {
      // wip-plugin is not published yet cause it's wip!
      preloadPlugins(fileManager, [{ id: "wip-plugin" }]);
      const manager = new PluginManager({ appVersion: "9.9.9", fileManager, registry });
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe("Discovery", () => {
    it("can list plugin entries", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
      const entries = await manager.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe("test-plugin");
      expect(entries[1].id).toBe("frozen-banana");
    });

    it("can get plugin details (versions, readme, etc..)", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
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
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
      await manager.installPlugin("test-plugin");
      const plugins = manager.getInstalledPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest.version).toBe("1.0.0");
    });

    it("can not install the latest plugins if not compatible", async () => {
      const manager = new PluginManager({ appVersion: "5.3.0", fileManager, registry });
      await manager.initialize();

      await expect(manager.installPlugin("test-plugin")).rejects.toThrow(
        NotSupportedPluginError
      );
    });

    it("can not install nonexistent plugins", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();

      await expect(manager.installPlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
    });

    it("can preinstall plugins", async () => {
      // TODO: could be simpler if preinstalled plugins are not like this.
      // Instead, we just call `manager.installPlugin()` during initialization.
      PluginManager.PREINSTALLED_PLUGINS = ["test-plugin", "frozen-banana"];
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();

      expect(manager.getInstalledPlugins()).toHaveLength(2);
      expect(manager.getInstalledPlugins()[0].manifest.id).toBe("test-plugin");
      expect(manager.getInstalledPlugins()[1].manifest.id).toBe("frozen-banana");
    })
  });

  describe("Loading", () => {
    it("can load compatible plugins", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
      await manager.installPlugin("test-plugin");

      expect(manager.getInstalledPlugins()[0]).toHaveProperty("compatible", true);

      await manager.installPlugin("frozen-banana");

      expect(manager.getInstalledPlugins()[1]).toHaveProperty("compatible", true);
    });

    // Simulates a user who installed a plugin, then downgraded the app.
    // The downgraded app version should not load incompatible plugins.
    it("can not load incompatible plugins", async () => {
      // 1. Setup a compatible app
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();

      // 2. Install a plugin
      await manager.installPlugin("test-plugin");

      // 3. Simulate a downgraded app
      const oldManager = new PluginManager({ appVersion: "5.3.0", fileManager, registry });
      await oldManager.initialize();

      // 4. The downgraded app should not load incompatible plugins
      expect(oldManager.getInstalledPlugins()[0]).toHaveProperty("compatible", false);
    });
  });

  describe("Updating", () => {
    it("can check for updates", async () => {
      const repositoryService = new MockPluginRepositoryService(server);
      repositoryService.setPluginsJson('core', [{ id: "test-plugin" }]);
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: "5.4.0" });

      const manager = new PluginManager({
        appVersion: "5.4.0",
        fileManager,
        registry: new PluginRegistry(repositoryService),
      });
      await manager.initialize();
      await manager.installPlugin("test-plugin");

      // The plugin is up to date
      await expect(manager.checkForUpdates("test-plugin")).resolves.toBe(false);

      // Simulate plugin update on the server
      repositoryService.setLatestRelease({ id: "test-plugin", version: "1.1.0", minAppVersion: "5.4.0" });

      // The plugin is now outdated
      await expect(manager.checkForUpdates("test-plugin")).resolves.toBe(true);
    });

    it("can update plugins automatically on start", async () => {
      // SETUP
      const repository = new MockPluginRepositoryService(server);
      const registry = new PluginRegistry(repository);
      repository.setPluginsJson('core', [{ id: "test-plugin" }]);
      repository.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: "5.4.0" });

      // STEP 1: Construct a plugin manager
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();

      // STEP 2: Install a plugin
      await manager.installPlugin("test-plugin");

      expect(manager.findInstalledPlugin('test-plugin').manifest.version).toBe("1.0.0");
      expect(manager.pluginSettings).toStrictEqual({
        "test-plugin": { autoUpdate: true },
      });

      // STEP 3: Release a new version of the plugin
      repository.setLatestRelease({ id: "test-plugin", version: "1.1.0", minAppVersion: "5.4.0" });

      // STEP 4: Construct a new plugin manager (simulating an app restart)
      const manager2 = new PluginManager({ appVersion: "5.4.0", fileManager, registry });

      // NOTE: Plugin manager should recognize the new version and update it automatically
      await manager2.initialize();
      expect(manager2.findInstalledPlugin('test-plugin').manifest.version).toBe("1.1.0");
    });

    it("can update plugins manually", async () => {
      const testPluginRepo = new MockPluginRepositoryService(server);

      testPluginRepo.setPluginsJson('core', [{ id: "test-plugin" }]);
      testPluginRepo.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: "5.4.0" });

      const manager = new PluginManager({
        appVersion: "5.4.0",
        fileManager,
        registry: new PluginRegistry(testPluginRepo),
      });
      await manager.initialize();
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      testPluginRepo.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: "5.4.0" });

      await manager.updatePlugin("test-plugin");
      expect(manager.getInstalledPlugins()[0].manifest.version).toBe("1.2.0");
    });

    it("can not update plugins if not compatible", async () => {
      const testRepositoryService = new MockPluginRepositoryService(server);
      testRepositoryService.setPluginsJson('core', [{ id: "test-plugin" }]);
      testRepositoryService.setLatestRelease({ id: "test-plugin", version: "1.0.0", minAppVersion: "5.4.0" });

      const manager = new PluginManager({
        appVersion: "5.4.0",
        fileManager,
        registry: new PluginRegistry(testRepositoryService),
      });
      await manager.initialize();
      await manager.installPlugin("test-plugin");

      // Simulate plugin update on the server
      testRepositoryService.setLatestRelease({ id: "test-plugin", version: "1.2.0", minAppVersion: "9.9.0" });

      await expect(manager.updatePlugin("test-plugin")).rejects.toThrow(
        NotSupportedPluginError
      );
    });

    it("can not update nonexistent plugins", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
      await expect(manager.updatePlugin("microwave-pizza")).rejects.toThrow(
        NotFoundPluginError
      );
    });
  });

  describe("Uninstalling", () => {
    it("can uninstall plugins", async () => {
      const manager = new PluginManager({ appVersion: "5.4.0", fileManager, registry });
      await manager.initialize();
      await manager.installPlugin("test-plugin");
      await manager.uninstallPlugin("test-plugin");

      expect(manager.getInstalledPlugins()).toHaveLength(0);
    });
  });
});

describe("Plugin License Constraints", () => {
  const { server, fileManager } = preparePluginSystemTestGroup();

  beforeEach(async () => {
    await LicenseKey.clear();
  });

  describe("Installation", () => {
    let registry: PluginRegistry;
    let manager: PluginManager;

    beforeAll(() => {
      const repositoryService = new MockPluginRepositoryService(server);
      const corePlugins = [
        { id: "core-plugin-0" },
        { id: "core-plugin-1" },
        { id: "core-plugin-2" },
        { id: "core-plugin-3" },
        { id: "core-plugin-4" },
        { id: "core-plugin-5" },
      ]
      const communityPlugins = [
        { id: "community-plugin-0" },
        { id: "community-plugin-1" },
        { id: "community-plugin-2" },
        { id: "community-plugin-3" },
        { id: "community-plugin-4" },
        { id: "community-plugin-5" },
      ];
      repositoryService.setPluginsJson('core', corePlugins);
      repositoryService.setPluginsJson('community', communityPlugins);
      for (const plugin of corePlugins) {
        repositoryService.setLatestRelease({ id: plugin.id, version: "1.0.0", minAppVersion: "5.4.0" });
      }
      for (const plugin of communityPlugins) {
        repositoryService.setLatestRelease({ id: plugin.id, version: "1.0.0", minAppVersion: "5.4.0" });
      }
      registry = new PluginRegistry(repositoryService);
    });

    beforeEach(async () => {
      manager = new PluginManager({
        appVersion: "9.9.9",
        fileManager,
        registry,
      });
      await manager.initialize();
    });

    it("free users - get 2 community plugins", async () => {
      // install some core plugins before binding license constraints
      await manager.installPlugin("core-plugin-0");
      await manager.installPlugin("core-plugin-1");

      bindLicenseConstraints(manager);

      // Can't install any more core plugins
      await expect(manager.installPlugin("core-plugin-2")).rejects.toThrow(
        ForbiddenPluginError
      );

      await manager.installPlugin("community-plugin-0");
      await manager.installPlugin("community-plugin-1");

      // As long as there are no errors, we're happy as can be
      expect.anything();

      await expect(manager.installPlugin("community-plugin-2")).rejects.toThrow(
        ForbiddenPluginError
      );

      await manager.uninstallPlugin("community-plugin-1");

      // Should be able to install the third plugin since we only have one now
      await manager.installPlugin("community-plugin-2");

      expect.anything();
    });

    it("indie users - get 5 plugins (core + community <= 5)", async () => {
      await createLicense({ licenseType: "PersonalLicense" });
      bindLicenseConstraints(manager);

      await manager.installPlugin("community-plugin-0");
      await manager.installPlugin("community-plugin-1");
      await manager.installPlugin("community-plugin-2");
      await manager.installPlugin("community-plugin-3");
      await manager.installPlugin("community-plugin-4");

      // No problem installing 5 community plugins
      expect.anything();

      // But we can't install any more
      await expect(manager.installPlugin("community-plugin-5")).rejects.toThrow(
        ForbiddenPluginError
      );
      await expect(manager.installPlugin("core-plugin-0")).rejects.toThrow(
        ForbiddenPluginError
      );

      await manager.uninstallPlugin("community-plugin-4");

      // We now have 4 plugins, installing the 6th one should work
      await manager.installPlugin("community-plugin-5");

      // Remove some plugins so we can try installing the core plugins
      await manager.uninstallPlugin("community-plugin-2");
      await manager.uninstallPlugin("community-plugin-3");
      await manager.uninstallPlugin("community-plugin-5");

      // We now have 2 plugins. We have 3 free slots.
      await manager.installPlugin("core-plugin-0");
      await manager.installPlugin("core-plugin-1");
      await manager.installPlugin("core-plugin-2");

      // :-D
      expect.anything();

      // We can't install any more
      await expect(manager.installPlugin("core-plugin-3")).rejects.toThrow(
        ForbiddenPluginError
      );
    });

    it("pro+ users - get unlimited plugins", async () => {
      await createLicense({ licenseType: "BusinessLicense" });
      bindLicenseConstraints(manager);

      await manager.installPlugin("core-plugin-0");
      await manager.installPlugin("core-plugin-1");
      await manager.installPlugin("core-plugin-2");
      await manager.installPlugin("core-plugin-3");
      await manager.installPlugin("core-plugin-4");
      await manager.installPlugin("core-plugin-5");
      await manager.installPlugin("community-plugin-0");
      await manager.installPlugin("community-plugin-1");
      await manager.installPlugin("community-plugin-2");
      await manager.installPlugin("community-plugin-3");
      await manager.installPlugin("community-plugin-4");
      await manager.installPlugin("community-plugin-5");

      expect.anything();
    });
  });

  describe("Activation", () => {
    let registry: PluginRegistry;

    beforeEach(async () => {
      // Register plugins in the registry so license constraints can check their type
      const repositoryService = new MockPluginRepositoryService(server);
      repositoryService.setPluginsJson('core', [
        { id: "core-plugin-0" },
        { id: "core-plugin-1" },
      ]);
      repositoryService.setPluginsJson('community', [
        { id: "comm-plugin-0" },
        { id: "comm-plugin-1" },
        { id: "comm-plugin-2" },
        { id: "comm-plugin-3" },
      ]);
      // Set up releases for all plugins
      repositoryService.setLatestRelease({ id: "core-plugin-0", version: "1.0.0", minAppVersion: "5.4.0" });
      repositoryService.setLatestRelease({ id: "core-plugin-1", version: "1.0.0", minAppVersion: "5.4.0" });
      repositoryService.setLatestRelease({ id: "comm-plugin-0", version: "1.0.0", minAppVersion: "5.4.0" });
      repositoryService.setLatestRelease({ id: "comm-plugin-1", version: "1.0.0", minAppVersion: "5.4.0" });
      repositoryService.setLatestRelease({ id: "comm-plugin-2", version: "1.0.0", minAppVersion: "5.4.0" });
      repositoryService.setLatestRelease({ id: "comm-plugin-3", version: "1.0.0", minAppVersion: "5.4.0" });

      registry = new PluginRegistry(repositoryService);

      // The temporary manager represents a user in this scenario:
      // 1. User installs some plugins
      // 2. User closes the app
      // The next steps should use a new manager to represent the user opens
      // the app again.
      const tempManager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
      await tempManager.initialize();
      await tempManager.installPlugin("core-plugin-0");
      await tempManager.installPlugin("core-plugin-1");
      await tempManager.installPlugin("comm-plugin-0");
      await tempManager.installPlugin("comm-plugin-1");
      await tempManager.installPlugin("comm-plugin-2");
      await tempManager.installPlugin("comm-plugin-3");
    });

    it("free users - pick the first 2 community plugins alphabetically and disable the rest", async () => {
      const manager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
      bindLicenseConstraints(manager);
      await manager.initialize();
      const plugins = manager.getInstalledPlugins().map((p) => ({
        id: p.manifest.id,
        disabled: p.disabled,
        disableReasons: p.disableReasons,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-1", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-2", disabled: true, disableReasons: [{ source: "license", cause: "max-community-plugins-reached", limit: 2 }] },
        { id: "comm-plugin-3", disabled: true, disableReasons: [{ source: "license", cause: "max-community-plugins-reached", limit: 2 }] },
        { id: "core-plugin-0", disabled: true, disableReasons: [{ source: "license", cause: "valid-license-required" }] },
        { id: "core-plugin-1", disabled: true, disableReasons: [{ source: "license", cause: "valid-license-required" }] },
      ]);
    });

    it("indie users - pick the first 5 plugins alphabetically and disable the rest", async () => {
      await createLicense({ licenseType: "PersonalLicense" });

      const manager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
      bindLicenseConstraints(manager);
      await manager.initialize();
      const plugins = manager.getInstalledPlugins().map((p) => ({
        id: p.manifest.id,
        disabled: p.disabled,
        disableReasons: p.disableReasons,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-1", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-2", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-3", disabled: false, disableReasons: undefined },
        { id: "core-plugin-0", disabled: false, disableReasons: undefined },
        { id: "core-plugin-1", disabled: true, disableReasons: [{ source: "license", cause: "max-plugins-reached", limit: 5 }] },
      ]);
    });

    it("pro+ users - get unlimited plugins", async () => {
      await createLicense({ licenseType: "BusinessLicense" });
      const manager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
      bindLicenseConstraints(manager);
      await manager.initialize();
      const plugins = manager.getInstalledPlugins().map((p) => ({
        id: p.manifest.id,
        disabled: p.disabled,
        disableReasons: p.disableReasons,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-1", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-2", disabled: false, disableReasons: undefined },
        { id: "comm-plugin-3", disabled: false, disableReasons: undefined },
        { id: "core-plugin-0", disabled: false, disableReasons: undefined },
        { id: "core-plugin-1", disabled: false, disableReasons: undefined },
      ]);
    });
  });
});

describe("Disabling plugins via config.ini", () => {
  const { server, fileManager } = preparePluginSystemTestGroup();

  let registry: PluginRegistry;
  let manager: PluginManager;

  beforeAll(() => {
    const repositoryService = new MockPluginRepositoryService(server);
    repositoryService.setPluginsJson('community', [
      { id: "community-plugin-0" },
      { id: "community-plugin-1" },
    ]);
    repositoryService.setLatestRelease({ id: "community-plugin-0", version: "1.0.0", minAppVersion: "5.4.0" });
    repositoryService.setLatestRelease({ id: "community-plugin-1", version: "1.0.0", minAppVersion: "5.4.0" });
    registry = new PluginRegistry(repositoryService);
  });

  beforeEach(() => {
    manager = new PluginManager({ appVersion: "9.9.9", registry, fileManager });
  });

  it("can force-disable installed plugins", async () => {
    bindIniConfig(manager, {
      plugins: { "community-plugin-0": { disabled: true } },
    });
    await manager.initialize();
    await manager.installPlugin("community-plugin-0");
    expect(manager.getInstalledPlugins()[0].disabled).toBe(true);

    // Only disable disabled plugins
    await manager.installPlugin("community-plugin-1");
    expect(manager.getInstalledPlugins()[1].disabled).toBe(false);
  });

  it("can force-disable preloaded plugins", async () => {
    preloadPlugins(fileManager, [
      { id: "community-plugin-0" },
      { id: "community-plugin-1" },
    ]);
    bindIniConfig(manager, {
      plugins: { "community-plugin-0": { disabled: true } },
    });
    await manager.initialize();

    expect(manager.getInstalledPlugins()[0].disabled).toBe(true);
    expect(manager.getInstalledPlugins()[1].disabled).toBe(false);
  });
});

