import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Vue from "vue";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { shallowMount } from "@vue/test-utils";
import TableTable from "@/components/tableview/TableTable.vue";
import store from "@/store";
import { AppEventMixin } from "@/common/AppEvent";
import { ConfigMetadataProvider } from "@/common/bksConfig/ConfigMetadataProvider";
import platformInfo from "@/common/platform_info";
import { AppDbHandlers } from "@/handlers/appDbHandlers";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { createConfig } from "@tests/vitest/integration/utils/config";

const handlers = AppDbHandlers as Record<string, any>;

TimeAgo.addDefaultLocale(en);

Vue.mixin(AppEventMixin);

function mountTableTable(tableName: string) {
  store.commit("newConnection", {
    id: 1,
    connectionType: "postgresql",
    defaultDatabase: "banana",
  });

  const $bksConfig = createConfig();
  const $bksConfigUI = new ConfigMetadataProvider({
    bksConfig: $bksConfig,
    platformInfo,
  });
  const wrapper = shallowMount(TableTable, {
    store,
    propsData: {
      active: false,
      tab: { id: 1 },
      table: { name: tableName, schema: "public", columns: [] },
    },
    mocks: {
      $util: {
        send(name: string, args: unknown) {
          return handlers[name](args);
        },
      },
      $bksConfig,
      $bksConfigUI,
      $pluralize: (word: string) => word,
    },
  });

  return wrapper.vm as any;
}

// Regression coverage for #4222.
// `buildPendingInserts` used to JSON.stringify every postgres jsonb cell, even
// when the user typed a string (which Tabulator hands back unparsed). That
// double-encoded the value before it ever left the renderer.
describe("TableTable.vue — buildPendingInserts", () => {
  const buildPendingInserts = (TableTable as any).options.methods.buildPendingInserts;

  function makeContext({
    columns,
    rowData,
    dialect = "postgresql",
  }: {
    columns: { columnName: string; dataType: string; generated?: boolean }[];
    rowData: Record<string, unknown>;
    dialect?: string;
  }) {
    return {
      table: {
        name: "jsontest",
        schema: "public",
        columns,
      },
      dialect,
      dialectData: { requireDataset: false },
      database: "banana",
      pendingChanges: {
        inserts: [{ row: { getData: () => rowData } }],
        updates: [],
        deletes: [],
      },
      isPrimaryKey(col: string) {
        return col === "id";
      },
    };
  }

  it("does not JSON.stringify a jsonb cell that is already a string (issue-4222)", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 1, data: '{"hello":"world"}' },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('{"hello":"world"}');
  });

  it("JSON.stringifies a jsonb cell when the value is an object", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 2, data: { hello: "world" } },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('{"hello":"world"}');
  });

  it("leaves a JSON scalar string for a jsonb cell untouched (issue-4222)", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 3, data: '"plain"' },
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toBe('"plain"');
  });

  it("does not touch jsonb cells on non-postgres dialects", () => {
    const ctx = makeContext({
      columns: [
        { columnName: "id", dataType: "integer" },
        { columnName: "data", dataType: "jsonb" },
      ],
      rowData: { id: 4, data: { hello: "world" } },
      dialect: "mysql",
    });

    const [insert] = buildPendingInserts.call(ctx);

    expect(insert.data[0].data).toEqual({ hello: "world" });
  });
});

// Regression coverage for #4567.
// `refreshTable()` used to re-fetch table KEYS but not column metadata, so a
// column rename was invisible after Refresh until the connection was reopened.
describe("TableTable.vue — refreshTable re-fetches columns (#4567)", () => {
  const refreshTable = (TableTable as any).options.methods.refreshTable;

  function makeRefreshCtx({ table }: { table: any }) {
    return {
      // the component instance state refreshTable touches:
      table,
      tabulator: {
        getPage: () => 1,
        replaceData: vi.fn().mockResolvedValue(undefined),
        getColumnLayout: () => [],
        setColumns: vi.fn().mockResolvedValue(undefined),
        setColumnLayout: vi.fn(),
        setPage: vi.fn(),
      },
      tableColumns: [],
      active: true,
      forceRedraw: false,
      // sibling methods refreshTable calls:
      getTableKeys: vi.fn().mockResolvedValue(undefined),
      loadIncomingKeys: vi.fn().mockResolvedValue(undefined),
      // the store dispatch we are asserting on:
      $store: { dispatch: vi.fn().mockResolvedValue(undefined) },
    };
  }

  it("dispatches updateTableColumns on explicit refresh (issue-4567)", async () => {
    const table = { name: "t", schema: "public", columns: [{ columnName: "c" }] };
    const ctx = makeRefreshCtx({ table });

    await refreshTable.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateTableColumns", table);
  });

  it("reloads the keys that reference this table", async () => {
    const ctx = makeRefreshCtx({ table: { name: "t", schema: "public", columns: [] } });

    await refreshTable.call(ctx);

    expect(ctx.loadIncomingKeys).toHaveBeenCalled();
  });
});

describe("TableTable.vue — loadIncomingKeys", () => {
  const loadIncomingKeys = (TableTable as any).options.methods.loadIncomingKeys;
  const incomingKey = {
    isComposite: false,
    fromTable: "order_items",
    fromSchema: "public",
    fromColumn: "order_id",
    toTable: "orders",
    toSchema: "public",
    toColumn: "id",
  };

  function makeCtx({ entityType = "table", getIncomingKeys = vi.fn().mockResolvedValue([incomingKey]) } = {}) {
    const row = { reformat: vi.fn() };
    return {
      row,
      table: { name: "orders", schema: "public", entityType },
      rawIncomingKeys: [],
      connection: { getIncomingKeys },
      tabulator: { getRows: () => [row] },
    };
  }

  it("stores the keys and re-formats rows so the links appear", async () => {
    const ctx = makeCtx();

    await loadIncomingKeys.call(ctx);

    expect(ctx.connection.getIncomingKeys).toHaveBeenCalledWith("orders", "public");
    expect(ctx.rawIncomingKeys).toEqual([incomingKey]);
    expect(ctx.row.reformat).toHaveBeenCalled();
  });

  it("doesn't query for views", async () => {
    const ctx = makeCtx({ entityType: "view" });

    await loadIncomingKeys.call(ctx);

    expect(ctx.connection.getIncomingKeys).not.toHaveBeenCalled();
  });

  it("leaves the table usable when the driver errors", async () => {
    const ctx = makeCtx({ getIncomingKeys: vi.fn().mockRejectedValue(new Error("nope")) });

    await loadIncomingKeys.call(ctx);

    expect(ctx.rawIncomingKeys).toEqual([]);
    expect(ctx.row.reformat).not.toHaveBeenCalled();
  });

  it("ignores results for a table that is no longer shown", async () => {
    let resolve: (keys: unknown[]) => void;
    const ctx = makeCtx({ getIncomingKeys: vi.fn(() => new Promise((r) => { resolve = r })) });

    const loading = loadIncomingKeys.call(ctx);
    ctx.table = { name: "customers", schema: "public", entityType: "table" };
    resolve([incomingKey]);
    await loading;

    expect(ctx.rawIncomingKeys).toEqual([]);
  });
});

describe("TableTable.vue — loadPersistence filters by tableId", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("reads back the layout persisted for this table", async () => {
    // public.one has to land first: the bug returned whichever row was
    // inserted first, whatever table was asked for.
    const one = mountTableTable("one");
    await one.persistenceWriter(one.tableId, "columns", ["one"]);

    const two = mountTableTable("two");
    await two.persistenceWriter(two.tableId, "columns", ["two"]);

    const vm = mountTableTable("two");
    await vm.loadPersistence();

    expect(vm.persistenceReader(vm.tableId, "columns")).toEqual(["two"]);
  });

  it("reads back nothing when this table has no persisted layout", async () => {
    const one = mountTableTable("one");
    await one.persistenceWriter(one.tableId, "columns", ["one"]);

    const vm = mountTableTable("other");
    await vm.loadPersistence();

    expect(vm.persistenceReader(vm.tableId, "columns")).toBe(false);
  });
});
