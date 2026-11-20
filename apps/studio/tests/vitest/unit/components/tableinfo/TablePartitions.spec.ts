import { describe, it, expect } from "vitest";
import { shallowMount, createLocalVue } from "@vue/test-utils";
import Vuex from "vuex";
import TablePartitions from "@/components/tableinfo/TablePartitions.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

describe("TablePartitions", () => {
  it("configures the Name column with adequate minWidth, widthGrow, and resizable", () => {
    const store = new Vuex.Store({
      state: {
        supportedFeatures: { editPartitions: false },
        connection: {},
      },
    });

    const wrapper = shallowMount(TablePartitions, {
      localVue,
      store,
      propsData: {
        table: { name: "users" },
        properties: { partitions: [] },
        tabID: "test-tab",
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
