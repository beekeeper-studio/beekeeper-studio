import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import Vue from "vue";
import Vuex from "vuex";
import { HideEntityModule } from "@/store/modules/HideEntityModule";

Vue.use(Vuex);

const WORKSPACE_ID = -1;
const CONNECTION_ID = 7;

function buildStore(overrides: Record<string, any> = {}) {
  return new Vuex.Store({
    state: {
      usedConfig: { id: CONNECTION_ID, workspaceId: WORKSPACE_ID },
      database: "app_db",
      tables: [
        { name: "users", schema: "public", entityType: "table" },
        { name: "orders_view", schema: "public", entityType: "view" },
      ],
      routines: [],
      ...overrides,
    } as any,
    modules: { hideEntities: HideEntityModule },
  });
}

describe("HideEntityModule persistence", () => {
  let store: ReturnType<typeof buildStore>;
  let send: Mock;

  beforeEach(() => {
    let nextId = 100;
    send = vi.fn(async (channel: string, args: any) => {
      if (channel === "appdb/hiddenEntity/new") {
        const { table, db, saved } = args.init;
        return {
          databaseName: db,
          schemaName: table.schema,
          entityName: table.name,
          entityType: table.entityType,
          connectionId: saved.id,
          workspaceId: saved.workspaceId,
        };
      }
      if (channel === "appdb/hiddenSchema/new") {
        const { name, db, saved } = args.init;
        return {
          name,
          databaseName: db,
          connectionId: saved.id,
          workspaceId: saved.workspaceId,
        };
      }
      if (channel === "appdb/hiddenEntity/save" || channel === "appdb/hiddenSchema/save") {
        return { ...args.obj, id: args.obj.id ?? nextId++ };
      }
      return args?.obj ?? [];
    });
    Vue.prototype.$util = { send };
    store = buildStore();
  });

  it("persists saved entity id on addEntity so removeEntity deletes it from appdb", async () => {
    const table = store.state.tables[0];

    await store.dispatch("hideEntities/addEntity", table);

    expect(send).toHaveBeenCalledWith("appdb/hiddenEntity/save", expect.anything());
    expect(store.state.hideEntities.entities[0].id).toBe(100);

    await store.dispatch("hideEntities/removeEntity", table);

    expect(send).toHaveBeenCalledWith("appdb/hiddenEntity/remove", {
      obj: expect.objectContaining({ id: 100, entityName: "users" }),
    });
    expect(store.state.hideEntities.entities).toHaveLength(0);
  });

  it("persists saved schema id on addSchema so removeSchema deletes it from appdb", async () => {
    await store.dispatch("hideEntities/addSchema", "audit");

    expect(send).toHaveBeenCalledWith("appdb/hiddenSchema/save", expect.anything());
    expect(store.state.hideEntities.schemas[0].id).toBe(100);

    await store.dispatch("hideEntities/removeSchema", "audit");

    expect(send).toHaveBeenCalledWith("appdb/hiddenSchema/remove", {
      obj: expect.objectContaining({ id: 100, name: "audit" }),
    });
    expect(store.state.hideEntities.schemas).toHaveLength(0);
  });

  it("loads hidden entities and schemas scoped to the active connection", async () => {
    send.mockImplementation(async (channel: string) => {
      if (channel === "appdb/hiddenEntity/find") {
        return [
          {
            id: 1,
            databaseName: "app_db",
            schemaName: "public",
            entityName: "users",
            entityType: "table",
            connectionId: CONNECTION_ID,
            workspaceId: WORKSPACE_ID,
          },
          {
            id: 2,
            databaseName: "app_db",
            schemaName: "public",
            entityName: "dropped_table",
            entityType: "table",
            connectionId: CONNECTION_ID,
            workspaceId: WORKSPACE_ID,
          },
        ];
      }
      if (channel === "appdb/hiddenSchema/find") {
        return [
          {
            id: 3,
            name: "internal",
            databaseName: "app_db",
            connectionId: CONNECTION_ID,
            workspaceId: WORKSPACE_ID,
          },
        ];
      }
      return [];
    });

    await store.dispatch("hideEntities/load");

    expect(send).toHaveBeenCalledWith("appdb/hiddenEntity/find", {
      options: { where: { connectionId: CONNECTION_ID, workspaceId: WORKSPACE_ID } },
    });
    expect(send).toHaveBeenCalledWith("appdb/hiddenSchema/find", {
      options: { where: { connectionId: CONNECTION_ID, workspaceId: WORKSPACE_ID } },
    });
    // Missing/unloaded entities are filtered out instead of returning undefined
    expect(store.getters["hideEntities/databaseEntities"]).toEqual([store.state.tables[0]]);
    expect(store.getters["hideEntities/databaseSchemas"]).toEqual(["internal"]);
  });

  it("updates state ids when maybeSave persists session-only hidden items", async () => {
    store.commit("hideEntities/set", {
      entities: [
        {
          id: null,
          databaseName: "app_db",
          schemaName: "public",
          entityName: "users",
          entityType: "table",
          connectionId: CONNECTION_ID,
          workspaceId: WORKSPACE_ID,
        },
      ],
      schemas: [
        {
          id: null,
          name: "internal",
          databaseName: "app_db",
          connectionId: CONNECTION_ID,
          workspaceId: WORKSPACE_ID,
        },
      ],
    });

    await store.dispatch("hideEntities/maybeSave");

    expect(store.state.hideEntities.entities[0].id).toBe(100);
    expect(store.state.hideEntities.schemas[0].id).toBe(101);
  });
});
