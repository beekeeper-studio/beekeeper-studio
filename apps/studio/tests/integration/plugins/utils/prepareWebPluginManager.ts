import PluginStoreService from "@/services/plugin/web/PluginStoreService";
import { Store } from "vuex";
import { State as RootState } from "@/store";
import { TableOrView } from "@/lib/db/models";
import type { WebPlugin } from "./WebPlugin";
import type { TransportPlugin } from "@/services/plugin";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { getDialectData } from "@shared/lib/dialects";
import { dialectFor } from "@shared/lib/dialects/models";
import type { FileHelpers } from "@/types";

export default function prepareWebPluginManagerTestGroup(options?: {
  tables?: TableOrView[];
  defaultSchema?: string;
  connectionType?: string;
}) {
  const registry = new Map<string, TransportPlugin>();
  const installedPlugins = new Map<string, TransportPlugin>();

  const utilityConnection = {
    send: jest.fn().mockImplementation((event: string, data?: any) => {
      if (event === "plugin/waitForInit") {
        return Promise.resolve();
      }
      if (event === "plugin/install") {
        return Promise.resolve(registry.get(data.id));
      }
      if (event === "plugin/plugins") {
        return Promise.resolve(Array.from(installedPlugins.values()));
      }
      return Promise.resolve();
    }),
  } as any as UtilityConnection;

  const fileHelpers = {
    save: jest.fn().mockResolvedValue(undefined),
  } as any as FileHelpers;

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
    } as any,
    getters: {
      "settings/themeType": "dark",
      "tabs/sortedTabs": [],
      dialect: dialectFor(connectionType),
      dialectData: getDialectData(dialectFor(connectionType)),
    },
    commit: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  } as any as Store<RootState>;

  return {
    utilityConnection,
    fileHelpers,
    pluginStore: new PluginStoreService(store, appEventBus),
    /** Make it act so that these plugins are loaded from the backend */
    mockInstalledPlugins(plugins: WebPlugin[]) {
      for (const plugin of plugins) {
        installedPlugins.set(plugin.manifest.id, {
          manifest: plugin.manifest,
          loadable: true,
          compatible: true,
          disabled: false,
        });
      }
    },
    /** Make it act so that these plugin are available in the registry.
     * You need this if you want to install a plugin. */
    mockPluginRegistry(plugins: WebPlugin[]) {
      for (const plugin of plugins) {
        registry.set(plugin.manifest.id, {
          manifest: plugin.manifest,
          loadable: true,
          compatible: true,
          disabled: false,
        });
      }
    },
  }
}
