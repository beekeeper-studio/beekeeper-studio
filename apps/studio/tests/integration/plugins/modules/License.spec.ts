import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "../utils/server";
import { createFileManager, cleanFileManager } from "../utils/fileManager";
import { MockPluginRepositoryService, Plugin } from "../utils/registry";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { UserSetting } from "@/common/appdb/models/user_setting";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { createLicense } from "@tests/utils";
import { LicenseModule } from "@commercial/backend/plugin-system/modules";

describe("Plugin License Constraints", () => {
  const server = createPluginServer();
  const registry = new PluginRegistry(new MockPluginRepositoryService(server));

  let fileManager: PluginFileManager;

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
    (PluginManager as any).PREINSTALLED_PLUGINS = [];
    const setting = await UserSetting.findOneBy({ key: "pluginSettings" });
    setting.userValue = "{}";
    await setting.save();
    await LicenseKey.clear();
    registry.clearCache();
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Installation", () => {
    const repositoryService = new MockPluginRepositoryService(
      createPluginServer()
    );
    const installRegistry = new PluginRegistry(repositoryService);

    const corePlugins: Plugin[] = Array.from({ length: 6 }, (_, i) => ({
      id: `core-plugin-${i}`,
      name: `Core Plugin ${i}`,
      latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
      readme: `# Core Plugin ${i}`,
      origin: "official" as const,
    }));

    const communityPlugins: Plugin[] = Array.from({ length: 6 }, (_, i) => ({
      id: `community-plugin-${i}`,
      name: `Community Plugin ${i}`,
      latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
      readme: `# Community Plugin ${i}`,
      origin: "community" as const,
    }));

    let manager: PluginManager;

    beforeEach(async () => {
      repositoryService.plugins = [...corePlugins, ...communityPlugins];
      installRegistry.clearCache();
      manager = new PluginManager({
        appVersion: "9.9.9",
        fileManager,
        registry: installRegistry,
      });
      await manager.initialize();
    });

    it("free users - get 2 community plugins", async () => {
      // install some core plugins before binding license constraints
      await manager.installPlugin("core-plugin-0");
      await manager.installPlugin("core-plugin-1");

      manager.registerModule(LicenseModule);

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
      manager.registerModule(LicenseModule);

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
      manager.registerModule(LicenseModule);

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
    const repositoryService = new MockPluginRepositoryService(
      createPluginServer()
    );
    const activationRegistry = new PluginRegistry(repositoryService);

    beforeEach(async () => {
      repositoryService.plugins = [
        {
          id: "core-plugin-0",
          name: "Core Plugin 0",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Core Plugin 0",
          origin: "official",
        },
        {
          id: "core-plugin-1",
          name: "Core Plugin 1",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Core Plugin 1",
          origin: "official",
        },
        {
          id: "comm-plugin-0",
          name: "Comm Plugin 0",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Comm Plugin 0",
          origin: "community",
        },
        {
          id: "comm-plugin-1",
          name: "Comm Plugin 1",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Comm Plugin 1",
          origin: "community",
        },
        {
          id: "comm-plugin-2",
          name: "Comm Plugin 2",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Comm Plugin 2",
          origin: "community",
        },
        {
          id: "comm-plugin-3",
          name: "Comm Plugin 3",
          latestRelease: { version: "1.0.0", minAppVersion: "5.4.0" },
          readme: "# Comm Plugin 3",
          origin: "community",
        },
      ];
      activationRegistry.clearCache();

      // The temporary manager represents a user in this scenario:
      // 1. User installs some plugins
      // 2. User closes the app
      // The next steps should use a new manager to represent the user opens
      // the app again.
      const tempManager = new PluginManager({
        appVersion: "9.9.9",
        registry: activationRegistry,
        fileManager,
      });
      await tempManager.initialize();
      await tempManager.installPlugin("core-plugin-0");
      await tempManager.installPlugin("core-plugin-1");
      await tempManager.installPlugin("comm-plugin-0");
      await tempManager.installPlugin("comm-plugin-1");
      await tempManager.installPlugin("comm-plugin-2");
      await tempManager.installPlugin("comm-plugin-3");
    });

    it("free users - pick the first 2 community plugins alphabetically and disable the rest", async () => {
      const manager = new PluginManager({
        appVersion: "9.9.9",
        registry: activationRegistry,
        fileManager,
      });
      manager.registerModule(LicenseModule);
      await manager.initialize();
      const snapshots = await manager.getPlugins();
      const plugins = snapshots.map((p: any) => ({
        id: p.manifest.id,
        disableState: p.disableState,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disableState: { disabled: false } },
        { id: "comm-plugin-1", disableState: { disabled: false } },
        {
          id: "comm-plugin-2",
          disableState: {
            disabled: true,
            reason: "disabled-by-license",
            detail: { cause: "max-community-plugins-reached", limit: 2 },
          },
        },
        {
          id: "comm-plugin-3",
          disableState: {
            disabled: true,
            reason: "disabled-by-license",
            detail: { cause: "max-community-plugins-reached", limit: 2 },
          },
        },
        {
          id: "core-plugin-0",
          disableState: {
            disabled: true,
            reason: "disabled-by-license",
            detail: { cause: "valid-license-required" },
          },
        },
        {
          id: "core-plugin-1",
          disableState: {
            disabled: true,
            reason: "disabled-by-license",
            detail: { cause: "valid-license-required" },
          },
        },
      ]);
    });

    it("indie users - pick the first 5 plugins alphabetically and disable the rest", async () => {
      await createLicense({ licenseType: "PersonalLicense" });

      const manager = new PluginManager({
        appVersion: "9.9.9",
        registry: activationRegistry,
        fileManager,
      });
      manager.registerModule(LicenseModule);
      await manager.initialize();
      const snapshots = await manager.getPlugins();
      const plugins = snapshots.map((p: any) => ({
        id: p.manifest.id,
        disableState: p.disableState,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disableState: { disabled: false } },
        { id: "comm-plugin-1", disableState: { disabled: false } },
        { id: "comm-plugin-2", disableState: { disabled: false } },
        { id: "comm-plugin-3", disableState: { disabled: false } },
        { id: "core-plugin-0", disableState: { disabled: false } },
        {
          id: "core-plugin-1",
          disableState: {
            disabled: true,
            reason: "disabled-by-license",
            detail: { cause: "max-plugins-reached", limit: 5 },
          },
        },
      ]);
    });

    it("pro+ users - get unlimited plugins", async () => {
      await createLicense({ licenseType: "BusinessLicense" });
      const manager = new PluginManager({
        appVersion: "9.9.9",
        registry: activationRegistry,
        fileManager,
      });
      manager.registerModule(LicenseModule);
      await manager.initialize();
      const snapshots = await manager.getPlugins();
      const plugins = snapshots.map((p: any) => ({
        id: p.manifest.id,
        disableState: p.disableState,
      }));
      expect(plugins).toStrictEqual([
        { id: "comm-plugin-0", disableState: { disabled: false } },
        { id: "comm-plugin-1", disableState: { disabled: false } },
        { id: "comm-plugin-2", disableState: { disabled: false } },
        { id: "comm-plugin-3", disableState: { disabled: false } },
        { id: "core-plugin-0", disableState: { disabled: false } },
        { id: "core-plugin-1", disableState: { disabled: false } },
      ]);
    });
  });
});
