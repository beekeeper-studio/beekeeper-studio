import WebPluginManager from "@/services/plugin/web/WebPluginManager";
import PluginStoreService from "@/services/plugin/web/PluginStoreService";
import Vue from "vue";
import Vuex, { Store } from "vuex";
import { State as RootState } from "@/store";
import { PluginsModule } from "@/store/modules/plugins";
import { TableOrView } from "@/lib/db/models";
import { WebPlugin } from "./WebPlugin";
import type { PluginSnapshot } from "@/services/plugin";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { getDialectData } from "@shared/lib/dialects";
import { dialectFor } from "@shared/lib/dialects/models";

Vue.use(Vuex);

/**
 * Represents the host application in plugin tests.
 * Manages the WebPluginManager and provides methods to interact with plugins.
 */
export class WebHost {
  private manager: WebPluginManager;
  private mockStore: Store<RootState>;
  private pluginStoreService: PluginStoreService;
  private initialized = false;
  private plugins = new Map<string, PluginSnapshot>();

  private mockUtilityConnection = {
    send: jest.fn().mockImplementation((event: string, data?: any) => {
      if (event === "plugin/waitForInit") {
        return Promise.resolve();
      }
      if (event === "plugin/plugins") {
        return Promise.resolve(Array.from(this.plugins.values()));
      }
      if (event === "plugin/entries") {
        return Promise.resolve({ official: [], community: [] });
      }
      return Promise.resolve();
    }),
  } as any as UtilityConnection;

  private mockAppEventBus = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  private mockFileHelpers = {
    save: jest.fn().mockResolvedValue(undefined),
  };

  constructor(options?: {
    tables?: TableOrView[];
    defaultSchema?: string;
    connectionType?: string;
  }) {
    const tables = options?.tables || [];
    const defaultSchema = options?.defaultSchema || "public";
    const connectionType = options?.connectionType || "postgresql";

    // Set up Vue.prototype.$util so PluginsModule actions can call $util.send
    Vue.prototype.$util = this.mockUtilityConnection;

    // Create a real Vuex store with the PluginsModule
    this.mockStore = new Vuex.Store({
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
        "settings/themeType": () => "dark",
        "tabs/sortedTabs": () => [],
        dialect: () => dialectFor(connectionType),
        dialectData: () => getDialectData(dialectFor(connectionType)),
      },
      modules: {
        plugins: PluginsModule,
        tabs: {
          mutations: {
            addTabTypeConfig() {},
          },
        },
      },
    }) as unknown as Store<RootState>;

    // Create plugin store service
    this.pluginStoreService = new PluginStoreService(
      this.mockStore,
      this.mockAppEventBus
    );

    // Create WebPluginManager
    this.manager = new WebPluginManager({
      utilityConnection: this.mockUtilityConnection,
      pluginStore: this.pluginStoreService,
      appVersion: "5.0.0",
      fileHelpers: this.mockFileHelpers,
    });
  }

  /**
   * Load a plugin into the host
   */
  async load(plugin: WebPlugin): Promise<void> {
    // Add plugin to the plugins map
    this.plugins.set(plugin.manifest.id, {
      manifest: plugin.manifest,
      loadable: true,
      origin: "unlisted",
      disableState: { disabled: false },
    });

    // Initialize the manager
    if (!this.initialized) {
      await this.manager.initialize();
      this.initialized = true;
    }

    // Register the plugin's iframe
    this.manager.registerIframe(
      plugin.manifest.id,
      plugin.iframe,
      plugin.context
    );
  }

  /**
   * Unload a plugin from the host
   */
  unload(plugin: WebPlugin): void {
    this.manager.unregisterIframe(plugin.manifest.id, plugin.iframe);
    this.plugins.delete(plugin.manifest.id);
  }

  getLoadedPlugins() {
    return this.manager.pluginStore.getSnapshots().map((s) => s.manifest);
  }
}
