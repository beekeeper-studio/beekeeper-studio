import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "@tests/integration/plugins/utils/server";
import { createFileManager, cleanFileManager } from "@tests/integration/plugins/utils/fileManager";
import { MockPluginRepositoryService } from "@tests/integration/plugins/utils/registry";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { UserSetting } from "@/common/appdb/models/user_setting";
import fs from "fs";
import path from "path";
import { BundledPluginModule } from "@commercial/backend/plugin-system/modules/BundledPluginModule";
import aiShellManifest from "@beekeeperstudio/bks-ai-shell/manifest.json";
import erDiagramManifest from "@beekeeperstudio/bks-er-diagram/manifest.json";

describe("BundledPluginModule", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  const registry = new PluginRegistry(repositoryService);

  let fileManager: PluginFileManager;

  function createPluginManager() {
    return new PluginManager({
      fileManager,
      registry,
      appVersion: "9.9.9",
    })
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
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  it("can install plugins manually", async () => {
    // Plugins are detected by a folder containing a manifest.json.
    // Here we copy from node_modules, but any source works.
    fs.cpSync(
      BundledPluginModule.resolve("@beekeeperstudio/bks-ai-shell"),
      path.join(fileManager.options.pluginsDirectory, "bks-ai-shell"),
      { recursive: true }
    );
    fs.cpSync(
      BundledPluginModule.resolve("@beekeeperstudio/bks-er-diagram"),
      path.join(fileManager.options.pluginsDirectory, "bks-er-diagram"),
      { recursive: true }
    );

    // Check if the plugins are installed
    const manager = createPluginManager();
    await manager.initialize();
    expect(manager.getPlugins()).toHaveLength(2);
    expect(manager.getPlugins()[0].manifest.id).toBe("bks-ai-shell");
    expect(manager.getPlugins()[1].manifest.id).toBe("bks-er-diagram");
  });

  it("ensures bundled plugins are installed", async () => {
    // First initialization - bundled plugins should be copied
    const manager = createPluginManager();
    manager.registerModule(BundledPluginModule);
    await manager.initialize();

    // Verify plugins were installed
    expect(manager.getPlugins()).toHaveLength(2);
    expect(manager.getPlugins()[0].manifest.id).toBe("bks-ai-shell");
    expect(manager.getPlugins()[1].manifest.id).toBe("bks-er-diagram");

    // Bundled plugins should NOT be copied again after uninstall
    await manager.uninstallPlugin("bks-ai-shell");
    await manager.uninstallPlugin("bks-er-diagram");
    expect(manager.getPlugins()).toHaveLength(0);

    const manager2 = createPluginManager();
    manager2.registerModule(BundledPluginModule);
    await manager2.initialize();
    expect(manager2.getPlugins()).toHaveLength(0);
  });
});
