import fs from "fs";
import path from "path";
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
import { SignatureModule } from "@commercial/backend/plugin-system/modules";
import { PluginError } from "@/lib/errors";
import {
  generateTestKeyPair,
  TestKeyPair,
} from "@tests/integration/plugins/utils/signing";

describe("Plugin Signature Verification", () => {
  const server = createPluginServer();
  const repositoryService = new MockPluginRepositoryService(server);
  repositoryService.plugins = [
    {
      id: "official-plugin",
      name: "Official Plugin",
      latestRelease: { version: "1.0.0", minAppVersion: "9.9.9" },
      readme: "# Official Plugin",
      origin: "official",
    },
    {
      id: "community-plugin",
      name: "Community Plugin",
      latestRelease: { version: "1.0.0", minAppVersion: "9.9.9" },
      readme: "# Community Plugin",
      origin: "community",
    },
  ];

  let registry: PluginRegistry;
  let fileManager: PluginFileManager;
  let keys: TestKeyPair;

  function createPluginManager() {
    return new PluginManager({ fileManager, registry, appVersion: "9.9.9" });
  }

  function signatureModule() {
    return SignatureModule.with({ key: keys.publicKey });
  }

  function pluginDir(id: string) {
    return path.join(fileManager.options.pluginsDirectory, id);
  }

  beforeAll(async () => {
    keys = await generateTestKeyPair();
    server.signingPrivateKey = keys.privateKey;
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
    registry = new PluginRegistry(repositoryService);
    fileManager = createFileManager();
    server.signatureMode = "valid";
  });

  afterEach(() => {
    cleanFileManager(fileManager);
    server.signatureMode = "none";
  });

  it("trusts and loads a validly signed plugin", async () => {
    server.signatureMode = "valid";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();

    await manager.installPlugin("official-plugin");

    const [plugin] = await manager.getPlugins();
    expect(plugin.verified).toBe("trusted");
    expect(plugin.origin).toBe("official");
    expect(plugin.disableState).toStrictEqual({ disabled: false });
  });

  it("does not verify community plugins", async () => {
    // Community plugins are third-party and not signed by Beekeeper, so an
    // unsigned one installs fine and keeps its origin.
    server.signatureMode = "none";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();

    await manager.installPlugin("community-plugin");

    const [plugin] = await manager.getPlugins();
    expect(plugin.manifest.id).toBe("community-plugin");
    expect(plugin.origin).toBe("community");
    expect(plugin.disableState).toStrictEqual({ disabled: false });
  });

  it("refuses to install a plugin whose contents were tampered with", async () => {
    server.signatureMode = "tampered";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();

    const promise = manager.installPlugin("official-plugin");
    await expect(promise).rejects.toBeInstanceOf(PluginError);
    await expect(promise).rejects.toHaveProperty("code", "SIGNATURE_INVALID");

    // Nothing is left behind on disk.
    expect(fs.existsSync(pluginDir("official-plugin"))).toBe(false);
    await expect(manager.getPlugins()).resolves.toHaveLength(0);
  });

  it("refuses a signature minted for a different plugin id", async () => {
    server.signatureMode = "wrong-id";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();

    await expect(
      manager.installPlugin("official-plugin")
    ).rejects.toHaveProperty("code", "SIGNATURE_INVALID");
  });

  it("refuses to install an unsigned plugin", async () => {
    server.signatureMode = "none";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();

    await expect(
      manager.installPlugin("official-plugin")
    ).rejects.toHaveProperty("code", "SIGNATURE_INVALID");
  });

  it("detects tampering with an already-installed plugin at load time", async () => {
    server.signatureMode = "valid";
    const manager = createPluginManager();
    manager.registerModule(signatureModule());
    await manager.initialize();
    await manager.installPlugin("official-plugin");

    // Tamper on disk after a clean install.
    fs.writeFileSync(
      path.join(pluginDir("official-plugin"), "index.html"),
      "hacked"
    );

    const manager2 = createPluginManager();
    manager2.registerModule(signatureModule());
    await manager2.initialize();

    const [plugin] = await manager2.getPlugins();
    expect(plugin.verified).toBe("invalid");
    expect(plugin.origin).toBe("unlisted");
    expect(plugin.disableState).toStrictEqual({
      disabled: true,
      reason: "signature-invalid",
    });
  });

  describe("Plugin id spoofing", () => {
    /** Side-load a plugin straight onto disk (never installed via the registry)
     * whose directory + manifest id claim an existing official plugin's id. */
    function sideloadSpoofedOfficial(id: string) {
      const dir = pluginDir(id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "manifest.json"),
        JSON.stringify({
          id,
          name: "Totally Legit Official Plugin",
          version: "1.0.0",
          manifestVersion: 1,
          minAppVersion: "9.9.9",
          capabilities: { views: [], menu: [] },
        })
      );
    }

    it("does not let an unsigned plugin inherit official privileges by reusing an official id", async () => {
      sideloadSpoofedOfficial("official-plugin");

      const manager = createPluginManager();
      manager.registerModule(signatureModule());
      await manager.initialize();

      const [plugin] = await manager.getPlugins();
      expect(plugin.verified).toBe("absent");
      expect(plugin.origin).toBe("unlisted");
    });
  });
});
