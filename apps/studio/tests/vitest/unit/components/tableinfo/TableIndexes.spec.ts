import { describe, it, expect } from "vitest";
import { shallowMount, createLocalVue } from "@vue/test-utils";
import Vuex from "vuex";
import TableIndexes from "@/components/tableinfo/TableIndexes.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

describe("TableIndexes", () => {
  it("configures the Name column with adequate minWidth, widthGrow, and resizable", () => {
    const store = new Vuex.Store({
      state: {
        connectionType: "postgresql",
        usedConfig: { readOnlyMode: false },
        connection: {
          supportedFeatures: () => ({ indexNullsNotDistinct: false }),
        },
      },
      getters: {
        dialect: () => "postgresql",
        dialectData: () => ({
          disabledFeatures: {},
        }),
      },
    });

    const wrapper = shallowMount(TableIndexes, {
      localVue,
      store,
      propsData: {
        table: { name: "users", columns: [] },
        properties: { indexes: [] },
        tabId: "test-tab",
        active: false,
        tabState: { dirty: false },
      },
      mocks: {
        $vHotkeyKeymap: () => ({}),
      },
    });

    const columns: any[] = (wrapper.vm as any).tableColumns;
    const nameCol = columns.find((c: any) => c && c.field === "name");

    expect(nameCol).toBeDefined();
    expect(nameCol.title).toBe("Name");
    expect(nameCol.minWidth).toBe(200);
    expect(nameCol.widthGrow).toBe(2);
    expect(nameCol.resizable).toBe(true);
  });
});
