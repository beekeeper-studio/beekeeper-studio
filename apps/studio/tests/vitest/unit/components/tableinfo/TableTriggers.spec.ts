import { describe, it, expect } from "vitest";
import { shallowMount, createLocalVue } from "@vue/test-utils";
import Vuex from "vuex";
import TableTriggers from "@/components/tableinfo/TableTriggers.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

describe("TableTriggers", () => {
  it("configures the Name column with adequate minWidth, widthGrow, and resizable for normal dialects", () => {
    const store = new Vuex.Store({
      state: {
        connectionType: "postgresql",
      },
      getters: {
        dialectData: () => ({
          notices: {},
        }),
      },
    });

    const wrapper = shallowMount(TableTriggers, {
      localVue,
      store,
      propsData: {
        table: { name: "users" },
        properties: { triggers: [] },
        tabId: "test-tab",
        active: false,
      },
      mocks: {
        $vHotkeyKeymap: () => ({}),
        $bksConfig: { ui: { tableTriggers: { maxColumnWidth: 300 } } },
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

  it("configures the Name column with adequate minWidth, widthGrow, and resizable for sqlite", () => {
    const store = new Vuex.Store({
      state: {
        connectionType: "sqlite",
      },
      getters: {
        dialectData: () => ({
          notices: {},
        }),
      },
    });

    const wrapper = shallowMount(TableTriggers, {
      localVue,
      store,
      propsData: {
        table: { name: "users" },
        properties: { triggers: [] },
        tabId: "test-tab",
        active: false,
      },
      mocks: {
        $vHotkeyKeymap: () => ({}),
        $bksConfig: { ui: { tableTriggers: { maxColumnWidth: 300 } } },
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
