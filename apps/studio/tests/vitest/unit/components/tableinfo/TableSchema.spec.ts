import { describe, it, expect, vi } from "vitest";
import { shallowMount, createLocalVue } from "@vue/test-utils";
import Vuex from "vuex";
import TableSchema from "@/components/tableinfo/TableSchema.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

describe("TableSchema", () => {
  it("configures the Name column with adequate minWidth, widthGrow, and resizable", () => {
    const store = new Vuex.Store({
      getters: {
        dialect: () => "postgresql",
        dialectData: () => ({
          columnTypes: [{ pretty: "varchar(255)" }],
          disabledFeatures: {},
        }),
      },
      state: {
        database: {},
        connection: {},
        usedConfig: { readOnlyMode: false },
      },
    });

    const wrapper = shallowMount(TableSchema, {
      localVue,
      store,
      propsData: {
        table: {
          name: "users",
          entityType: "table",
          columns: [{ columnName: "id", dataType: "integer" }],
        },
        tabID: "test-tab",
        active: false,
        primaryKeys: [],
        tabState: { dirty: false },
      },
      mocks: {
        $vHotkeyKeymap: () => ({}),
      },
    });

    const columns: any[] = (wrapper.vm as any).tableColumns;
    const nameCol = columns.find((c) => c.field === "columnName");

    expect(nameCol).toBeDefined();
    expect(nameCol.title).toBe("Name");
    expect(nameCol.minWidth).toBe(200);
    expect(nameCol.widthGrow).toBe(2);
    expect(nameCol.resizable).toBe(true);
  });
});
