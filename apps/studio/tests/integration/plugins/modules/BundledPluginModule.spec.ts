import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { createPluginServer } from "@tests/integration/plugins/utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "@tests/integration/plugins/utils/fileManager";
import { MockPluginRepositoryService } from "@tests/integration/plugins/utils/registry";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { UserSetting } from "@/common/appdb/models/user_setting";
import fs from "fs";
import path from "path";
import { BundledPluginModule } from "@commercial/backend/plugin-system/modules/BundledPluginModule";

function bundledVersion(pkg: string): string {
  const manifestPath = path.join(
    BundledPluginModule.resolve(pkg),
    "manifest.json"
  );
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")).version;
}

describe("BundledPluginModule", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  const registry = new PluginRegistry(repositoryService);

  let fileManager: PluginFileManager;

  /**
   * Put a bundled plugin on disk, as if the user had installed it. Pass a
   * version to rewrite the manifest, or "latest" to keep the bundled one.
   */
  function copyBundledPlugin(pkg: string, version: string) {
    const source = BundledPluginModule.resolve(pkg);
    const manifestPath = path.join(source, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    fs.cpSync(
      source,
      path.join(fileManager.options.pluginsDirectory, manifest.id),
      { recursive: true }
    );

    if (version !== "latest") {
      manifest.version = version;
      fs.writeFileSync(
        path.join(
          fileManager.options.pluginsDirectory,
          manifest.id,
          "manifest.json"
        ),
        JSON.stringify(manifest)
      );
    }
  }

  function createPluginManager() {
    return new PluginManager({
      fileManager,
      registry,
      appVersion: "9.9.9",
    });
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
    copyBundledPlugin("@beekeeperstudio/bks-ai-shell", "latest");
    copyBundledPlugin("@beekeeperstudio/bks-er-diagram", "latest");

    // Check if the plugins are installed
    const manager = createPluginManager();
    await manager.initialize();
    const plugins = await manager.getPlugins();
    expect(plugins).toHaveLength(2);
    expect(plugins[0].manifest.id).toBe("bks-ai-shell");
    expect(plugins[1].manifest.id).toBe("bks-er-diagram");
  });

  it("ensures bundled plugins are installed", async () => {
    // First initialization - bundled plugins should be copied
    const manager = createPluginManager();
    manager.registerModule(BundledPluginModule);
    await manager.initialize();

    // Verify plugins were installed
    const plugins = await manager.getPlugins();
    expect(plugins).toHaveLength(2);
    expect(plugins[0].manifest.id).toBe("bks-ai-shell");
    expect(plugins[1].manifest.id).toBe("bks-er-diagram");

    // Bundled plugins should NOT be copied again after uninstall
    await manager.uninstallPlugin("bks-ai-shell");
    await manager.uninstallPlugin("bks-er-diagram");
    await expect(manager.getPlugins()).resolves.toHaveLength(0);

    const manager2 = createPluginManager();
    manager2.registerModule(BundledPluginModule);
    await manager2.initialize();
    await expect(manager2.getPlugins()).resolves.toHaveLength(0);
  });

  it("ensures bundled plugins are updated", async () => {
    // v0 plugins should be in the .config/plugins folder
    copyBundledPlugin("@beekeeperstudio/bks-ai-shell", "0.0.0");
    copyBundledPlugin("@beekeeperstudio/bks-er-diagram", "0.0.0");

    // Initialize plugin system
    const manager2 = createPluginManager();
    manager2.registerModule(BundledPluginModule);
    await manager2.initialize();

    // Verify they're updated
    const updated = await manager2.getPlugins();
    expect(updated).toHaveLength(2);
    expect(updated[0].manifest.version).toBe(
      bundledVersion("@beekeeperstudio/bks-ai-shell")
    );
    expect(updated[1].manifest.version).toBe(
      bundledVersion("@beekeeperstudio/bks-er-diagram")
    );
  });
});
