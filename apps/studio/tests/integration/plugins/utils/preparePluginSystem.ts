import PluginRegistry from "@/services/plugin/PluginRegistry";
import { MockPluginRepositoryService } from "./registry";
import { createPluginServer } from "./server";
import { cleanFileManager, createFileManager } from "./fileManager";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import migration from "@/migration/20250529_add_plugin_settings";
import { PluginManager } from "@/services/plugin";
import { UserSetting } from "@/common/appdb/models/user_setting";

export default function preparePluginSystemTestGroup() {
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

