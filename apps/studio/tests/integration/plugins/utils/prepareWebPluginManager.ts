import PluginStoreService from "@/services/plugin/web/PluginStoreService";
import { Store } from "vuex";
import { State as RootState } from "@/store";
import { TableOrView } from "@/lib/db/models";
import { PluginManager } from "@/services/plugin";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { getDialectData } from "@shared/lib/dialects";
import { dialectFor } from "@shared/lib/dialects/models";
import { PluginHandlers } from "@commercial/backend/handlers/pluginHandlers";

export default function prepareWebPluginManagerTestGroup(options?: {
  tables?: TableOrView[];
  defaultSchema?: string;
  connectionType?: string;
  pluginManager: PluginManager;
}) {
  const handlers = PluginHandlers(options.pluginManager);
  handlers['plugin/waitForInit'] = async () => {
    if (!options.pluginManager.isInitialized) {
      await options.pluginManager.initialize();
    }
  };

  const utilityConnection = {
    send: jest.fn().mockImplementation((event: string, data?: any) =>
      handlers[event](data)
    ),
  } as any as UtilityConnection;

  const appEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  const tables = options?.tables || [];
  const defaultSchema = options?.defaultSchema || "public";
  const connectionType = options?.connectionType || "postgresql";

  // Create mock store with tables
  const store = {
    state: {
      tables,
      usedConfig: {
        id: "test-conn",
        name: "Test Connection",
        readOnlyMode: false,
      },
      connection: null,
      connectionType,
      database: "test_db",
      defaultSchema,
      workspaceId: null,
      installedPlugins: [],
    } as any,
    getters: {
      "settings/themeType": "dark",
      "tabs/sortedTabs": [],
      dialect: dialectFor(connectionType),
      dialectData: getDialectData(dialectFor(connectionType)),
    },
    commit: jest.fn((...args) => {
      if (args[0] === "installedPlugins") {
        store.state.installedPlugins = args[1];
      }
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  } as any as Store<RootState>;

  return {
    utilityConnection,
    pluginStore: new PluginStoreService(store, appEventBus),
  }
}
