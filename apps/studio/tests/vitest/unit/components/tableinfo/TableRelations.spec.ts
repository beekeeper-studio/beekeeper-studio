import { describe, it, expect } from "vitest";
import { shallowMount, createLocalVue } from "@vue/test-utils";
import Vuex from "vuex";
import TableRelations from "@/components/tableinfo/TableRelations.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

describe("TableRelations", () => {
  it("configures the Name column with adequate minWidth, widthGrow, and resizable", () => {
    const store = new Vuex.Store({
      state: {
        tables: [],
        usedConfig: { readOnlyMode: false },
        connection: {},
      },
      getters: {
        dialect: () => "postgresql",
        schemas: () => [],
        schemaTables: () => [],
        dialectData: () => ({
          constraintActions: [],
          disabledFeatures: {},
        }),
      },
    });

    const wrapper = shallowMount(TableRelations, {
      localVue,
      store,
      propsData: {
        table: { name: "users", columns: [] },
        properties: { relations: [] },
        tabId: "test-tab",
        active: false,
        tabState: { dirty: false },
      },
      mocks: {
        $vHotkeyKeymap: () => ({}),
      },
    });

    const columns: any[] = (wrapper.vm as any).tableColumns;
    const nameCol = columns.find((c: any) => c && c.field === "constraintName");

    expect(nameCol).toBeDefined();
    expect(nameCol.title).toBe("Name");
    expect(nameCol.minWidth).toBe(200);
    expect(nameCol.widthGrow).toBe(2);
    expect(nameCol.resizable).toBe(true);
  });
});
