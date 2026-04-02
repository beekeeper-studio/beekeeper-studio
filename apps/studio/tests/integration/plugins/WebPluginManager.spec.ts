/**
 * @jest-environment jsdom
 */

import "./setup";
import { WebHost, WebPlugin } from "./utils";
import { tables } from "./utils/fixtures";
import _ from "lodash";

describe("WebPluginManager", () => {
  let host: WebHost;
  let plugin: WebPlugin;

  beforeEach(() => {
    // Create host with mock tables
    host = new WebHost({
      tables,
      defaultSchema: "public",
      connectionType: "postgresql",
    });

    // Create plugin
    plugin = new WebPlugin();
  });

  afterEach(() => {
    plugin?.dispose();
  });

  describe("Plugin Loading", () => {
    it("should load a plugin successfully", async () => {
      await host.load(plugin);

      const enabledPlugins = await host.getLoadedPlugins();
      expect(enabledPlugins).toHaveLength(1);
      expect(enabledPlugins[0].id).toBe(plugin.manifest.id);
    });
  });

  describe("Plugin APIs", () => {
    beforeEach(async () => {
      await host.load(plugin);
    });

    afterEach(() => {
      plugin.clearResponses();
      host.unload(plugin);
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
        expect(responses[0].id).toBe(0);
        expect(responses[1].id).toBe(1);

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
