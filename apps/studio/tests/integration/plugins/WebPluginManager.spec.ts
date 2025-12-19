/**
 * @jest-environment jsdom
 */

import "./setup";
import { WebPluginManager } from "@/services/plugin/web";
import { WebPlugin } from "./utils/WebPlugin";
import { tables } from "./utils/fixtures";
import _ from "lodash";
import prepareWebPluginManagerTestGroup from "./utils/prepareWebPluginManager";
import { preloadPlugins } from "./utils/fileManager";
import preparePluginSystemTestGroup from "./utils/preparePluginSystem";
import { PluginManager } from "@/services/plugin";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import { MockPluginRepositoryService } from "./utils/registry";
import PluginStoreService from "@/services/plugin/web/PluginStoreService";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";

describe("WebPluginManager", () => {
  const { server, fileManager, emptyRegistry } = preparePluginSystemTestGroup();

  describe("Loading Plugins", () => {
    let webManager: WebPluginManager;

    beforeAll(() => {
      const repository = new MockPluginRepositoryService(server);
      const registry = new PluginRegistry(repository);

      // Publish one plugin called "test-plugin"
      repository.setPluginsJson('core', [{ id: "test-plugin" }]);
      repository.setLatestRelease({ id: "test-plugin", version: "1.0.0" });

      const pluginManager = new PluginManager({ appVersion: "9.9.9", fileManager, registry });
      const { pluginStore, utilityConnection } = prepareWebPluginManagerTestGroup({ pluginManager });

      webManager = new WebPluginManager({
        // Shouldn't care about the app version. It's already tested in PluginManager.spec.ts.
        appVersion: "9.9.9",
        pluginStore,
        utilityConnection,
      });
    });

    it("can load plugins at startup", async () => {
      preloadPlugins(fileManager, [{ id: "test-plugin" }]);
      await webManager.initialize();
      const plugins = await webManager.getEnabledPlugins();

      expect(plugins[0].id).toBe("test-plugin");
    });

    it("can load plugins at runtime (by installing)", async () => {
      await webManager.initialize();
      await webManager.install("test-plugin");
      const plugins = await webManager.getEnabledPlugins();

      expect(plugins[0].id).toBe("test-plugin");
    });
  });

  describe("Disabling Plugins", () => {
    let webManager: WebPluginManager;
    let pluginStore: PluginStoreService;
    let utilityConnection: UtilityConnection;

    beforeAll(() => {
      preloadPlugins(fileManager, [{
        id: "test-plugin",
        capabilities: {
          views: [{
            id: "test-view",
            name: "Test View",
            type: "base-tab",
            entry: "index.html",
          }],
          menu: [{
            command: "test-command",
            view: "test-view",
            name: "Test Menu Item",
            placement: [
              "newTabDropdown",
              "menubar.tools",
              "editor.query.context",
            ],
          }],
        },
      }]);
      const pluginManager = new PluginManager({
        appVersion: "9.9.9",
        fileManager,
        pluginSettings: {
          // IMPORTANT: PluginManager is the backend. We want to disable from here!
          "test-plugin": { disabled: true },
        },
        registry: emptyRegistry,
      });
      const util = prepareWebPluginManagerTestGroup({ pluginManager });
      pluginStore = util.pluginStore;
      utilityConnection = util.utilityConnection;
      webManager = new WebPluginManager({
        appVersion: "9.9.9",
        pluginStore,
        utilityConnection,
      });
    });

    it("should not be accessible from the UI", async () => {
      const addTabTypeConfigsSpy = jest.spyOn(pluginStore, "addTabTypeConfigs");
      const addMenuBarItemSpy = jest.spyOn(pluginStore, "addMenuBarItem");
      const addPopupMenuItemSpy = jest.spyOn(pluginStore, "addPopupMenuItem");

      await webManager.initialize();

      expect(addTabTypeConfigsSpy).not.toHaveBeenCalled();
      expect(addMenuBarItemSpy).not.toHaveBeenCalled();
      expect(addPopupMenuItemSpy).not.toHaveBeenCalled()
    });

    it("should be flagged as disabled", async () => {
      await webManager.initialize();
      expect(webManager.pluginOf("test-plugin").disabled).toBe(true);
    });
  });

  describe("Plugin APIs", () => {
    let plugin: WebPlugin;
    let manager: WebPluginManager;

    beforeAll(async () => {
      preloadPlugins(fileManager, [{
        id: "test-plugin",
        capabilities: {
          views: [{
            id: "test-view",
            name: "Test View",
            type: "base-tab",
            entry: "index.html",
          }],
          menu: [],
        },
      }]);
      const pluginManager = new PluginManager({ appVersion: "9.9.9", fileManager, registry: emptyRegistry });
      const { pluginStore, utilityConnection } = prepareWebPluginManagerTestGroup({ pluginManager, tables });
      manager = new WebPluginManager({ appVersion: "9.9.9", pluginStore, utilityConnection });
      await manager.initialize();
      const plugins = await manager.getEnabledPlugins();
      plugin = new WebPlugin(plugins[0]);
      manager.registerIframe(plugin.manifest.id, plugin.iframe, plugin.context);
    });

    afterAll(async () => {
      plugin.destroy();
      manager.unregisterIframe(plugin.manifest.id, plugin.iframe);
      await manager.uninstall(plugin.manifest.id);
    });

    beforeEach(() => {
      plugin.clearResponses();
    });

    describe("API Request/Response Structure", () => {
      it("should return response with matching request ID on success", async () => {
        const response = await plugin.request("getTables", {
          schema: "public",
        });

        // Verify response structure
        expect(response).toMatchObject({
          id: expect.any(Number),
          result: expect.any(Array),
        });
      });

      it("should return response with error property when request fails", async () => {
        const response = await plugin.request("somethingDoesNotExist", {});

        // Verify error response structure
        expect(response).toMatchObject({
          id: expect.any(Number),
          error: {
            message: expect.any(String),
          },
        });
        expect(response.result).toBeUndefined();
      });

      it("should send response to correct iframe via postMessage", async () => {
        await plugin.request("getTables", {
          schema: "public",
        });
        expect(plugin.hasResponses()).toBe(true);
      });

      it("should handle multiple concurrent requests with different IDs", async () => {
        // Send multiple requests
        await plugin.request("getTables", { schema: "public" });
        await plugin.request("getTables", { schema: "private" });

        // All three requests should have received responses
        expect(plugin.getResponseCount()).toBe(2);

        // Verify each response has unique ID
        const responses = plugin.getAllResponses();
        const ids = responses.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);

        // Verify all have proper structure
        responses.forEach((response) => {
          expect(response).toHaveProperty("result");
        });
      });

      it("should not respond to messages without request ID (notifications)", async () => {
        // Send a notification (no id field)
        await plugin.notify("someNotification", { data: "test" });

        // Should not send a response for notifications
        expect(plugin.hasResponses()).toBe(false);
      });

      it("should handle requests with different arg types", async () => {
        // Test with empty args
        let response = await plugin.request("getTables", {});
        expect(response).toHaveProperty("result");

        // Test with string arg
        response = await plugin.request("getTables", { schema: "public" });
        expect(response).toHaveProperty("result");
      });
    });

    describe("getTables", () => {
      it("should return default schema tables when no schema is provided", async () => {
        const response = await plugin.request("getTables", {});

        // Should only return tables from default schema (public)
        expect(response.result).toHaveLength(2);
        expect(response.result).toStrictEqual([
          { name: "users", schema: "public" },
          { name: "orders", schema: "public" },
        ]);
      });

      it("should return only tables from a specific schema when schema is provided", async () => {
        const response = await plugin.request("getTables", {
          schema: "private",
        });

        expect(response.result).toHaveLength(2);
        expect(response.result).toStrictEqual([
          { name: "products", schema: "private" },
          { name: "categories", schema: "private" },
        ]);
      });

      it("should return empty array when schema does not exist", async () => {
        const response = await plugin.request("getTables", {
          schema: "nonexistent",
        });

        expect(response.result).toHaveLength(0);
        expect(response.result).toEqual([]);
      });
    });

    describe("getColumns", () => {
      it("should return columns for a table in default schema when no schema is provided", async () => {
        const response = await plugin.request("getColumns", { table: "users" });

        expect(response.result).toHaveLength(3);
        expect(response.result.map((c) => _.pick(c, ["name", "type"]))).toStrictEqual([
          { name: "id", type: "integer" },
          { name: "name", type: "varchar" },
          { name: "email", type: "varchar" },
        ]);
      });

      it("should return columns for a table in a specific schema when schema is provided", async () => {
        const response = await plugin.request("getColumns", {
          table: "products",
          schema: "private",
        });

        expect(response.result).toHaveLength(3);
        expect(response.result.map((c) => _.pick(c, ["name", "type"]))).toStrictEqual([
          { name: "id", type: "integer" },
          { name: "name", type: "varchar" },
          { name: "price", type: "decimal" },
        ]);
      });

      it("should return error when table does not exist", async () => {
        const response = await plugin.request("getColumns", {
          table: "nonexistent",
        });
        expect(response.error.message).toContain("Table not found");
      });

      it("should return error when table exists in a different schema", async () => {
        const response = await plugin.request("getColumns", {
          table: "products",
          schema: "public",
        });
        expect(response.error.message).toContain("Table not found");
      });

      it("should return columns when table name exists in multiple schemas with correct schema specified", async () => {
        // First, let's verify we can get columns from public schema
        const publicResponse = await plugin.request("getColumns", {
          table: "users",
          schema: "public",
        });

        expect(publicResponse.result.map((c) => _.pick(c, ["name", "type"]))).toStrictEqual([
          { name: "id", type: "integer" },
          { name: "name", type: "varchar" },
          { name: "email", type: "varchar" },
        ]);

        // Then verify we can get columns from private schema
        const privateResponse = await plugin.request("getColumns", {
          table: "products",
          schema: "private",
        });

        expect(privateResponse.result.map((c) => _.pick(c, ["name", "type"]))).toStrictEqual([
          { name: "id", type: "integer" },
          { name: "name", type: "varchar" },
          { name: "price", type: "decimal" },
        ]);
      });
    });
  });
});
