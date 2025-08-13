import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginManager from "@/services/plugin/PluginManager";
import { cleanTmpDir, mockPluginServer, tmpDir } from "./helpers";

describe("Basic Plugin Management", () => {
  let downloadDirectory: string;
  let pluginsDirectory: string;

  let manager: PluginManager;

  mockPluginServer();

  beforeEach(async () => {
    downloadDirectory = tmpDir();
    pluginsDirectory = tmpDir();
    manager = new PluginManager({
      fileManager: new PluginFileManager({
        downloadDirectory,
        pluginsDirectory,
      }),
    });
    await manager.initialize();
  });

  afterEach(async () => {
    cleanTmpDir(downloadDirectory);
    cleanTmpDir(pluginsDirectory);
  });

  it("can install plugins", async () => {
    await manager.installPlugin("test-plugin");
    const plugins = await manager.getEnabledPlugins();
    expect(plugins).toHaveLength(1);
  });

  it("can update plugins", async () => {
    await manager.installPlugin("test-plugin");
    await manager.updatePlugin("test-plugin");
    expect.anything();
  });

  it("can uninstall plugins", async () => {
    await manager.installPlugin("test-plugin");
    await manager.uninstallPlugin("test-plugin");
    const plugins = await manager.getEnabledPlugins();
    expect(plugins).toHaveLength(0);
  });
});

describe("Preinstalled Plugins", () => {
  const pluginsDirectory = tmpDir();
  const downloadDirectory = tmpDir();

  let pluginSettings = {};

  function createPluginManager() {
    return new PluginManager({
      fileManager: new PluginFileManager({
        downloadDirectory,
        pluginsDirectory,
      }),
      onSetPluginSettings: (settings) => (pluginSettings = settings),
    });
  }

  mockPluginServer();

  afterEach(async () => {
    cleanTmpDir(pluginsDirectory);
    cleanTmpDir(downloadDirectory);
    pluginSettings = {};
  });

  it("can preinstall plugins", async () => {
    const manager = createPluginManager();
    await manager.initialize({
      preinstalledPlugins: ["test-plugin"],
      pluginSettings,
    });
    const plugins = await manager.getEnabledPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("Test Plugin");
    expect(pluginSettings).toHaveProperty("test-plugin");
  });

  it("should not install preinstalled plugins twice", async () => {
    await createPluginManager().initialize({
      preinstalledPlugins: ["test-plugin"],
      pluginSettings,
    });
    const manager = createPluginManager();
    await manager.initialize({
      preinstalledPlugins: ["test-plugin"],
      pluginSettings,
    });
    const plugins = await manager.getEnabledPlugins();
    expect(plugins).toHaveLength(1);
  });

  it("should not install preinstalled plugins if it has been uninstalled", async () => {
    const manager = createPluginManager();
    await manager.initialize({
      preinstalledPlugins: ["test-plugin"],
      pluginSettings,
    });
    await manager.uninstallPlugin("test-plugin");

    const manager2 = createPluginManager();
    await manager2.initialize({
      preinstalledPlugins: ["test-plugin"],
      pluginSettings,
    });
    const plugins = await manager2.getEnabledPlugins();
    expect(plugins).toHaveLength(0);
  });
});
