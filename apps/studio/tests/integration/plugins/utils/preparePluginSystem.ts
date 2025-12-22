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
  const fileManager = createFileManager();
  const emptyRegistry = new PluginRegistry(new MockPluginRepositoryService(server));

  beforeAll(async () => {
    await TestOrmConnection.connect();
    const runner = TestOrmConnection.connection.connection.createQueryRunner();
    await migration.testRun(runner);
    await runner.release();
  });

  afterAll(async () => await TestOrmConnection.disconnect());

  beforeEach(async () => {
    PluginManager.PREINSTALLED_PLUGINS = [];
    const setting = await UserSetting.findOneBy({ key: "pluginSettings" });
    setting.userValue = "{}";
    await setting.save();
  });

  afterEach(() => cleanFileManager(fileManager));

  return {
    fileManager,
    server,
    emptyRegistry,
  };
}

