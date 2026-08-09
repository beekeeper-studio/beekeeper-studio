import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TableLength from "@/components/common/TableLength.vue";
import { clearRecordCountCache } from "@/components/common/tableLengthCache";

Vue.use(Vuex);

describe("TableLength.vue", () => {
  const table = { name: "users", schema: "public" };

  let getTableLength: jest.Mock;
  let getFilteredDataCount: jest.Mock;
  let getQueryForFilter: jest.Mock;
  let store: Vuex.Store<unknown>;

  function createWrapper(props: Record<string, unknown> = {}) {
    return mount(TableLength, {
      store,
      propsData: {
        table,
        ...props,
      },
    });
  }

  beforeEach(() => {
    clearRecordCountCache();
    getTableLength = jest.fn().mockResolvedValue(1000);
    getFilteredDataCount = jest.fn().mockResolvedValue(42);
    getQueryForFilter = jest.fn().mockResolvedValue("id = 1");

    store = new Vuex.Store({
      state: {
        connection: {
          getTableLength,
          getFilteredDataCount,
          getQueryForFilter,
        },
      },
    });
  });

  it("fetches total records automatically on mount", async () => {
    createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).toHaveBeenCalledWith("users", "public");
  });

  it("refetches when filters change", async () => {
    const wrapper = createWrapper({ filters: [] });

    await Vue.nextTick();
    await Vue.nextTick();
    getTableLength.mockClear();

    await wrapper.setProps({
      filters: [{ field: "id", type: "=", value: "1" }],
    });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getQueryForFilter).toHaveBeenCalled();
    expect(getFilteredDataCount).toHaveBeenCalledWith(
      "users",
      "public",
      expect.any(String)
    );
    expect(getTableLength).not.toHaveBeenCalled();
  });

  it("refetches when table identity changes", async () => {
    const wrapper = createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();
    getTableLength.mockClear();

    await wrapper.setProps({
      table: { name: "orders", schema: "public" },
    });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).toHaveBeenCalledWith("orders", "public");
  });

  it("does not refetch when table reference changes but identity stays the same", async () => {
    const wrapper = createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();
    getTableLength.mockClear();

    await wrapper.setProps({
      table: { name: "users", schema: "public", columns: [] },
    });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).not.toHaveBeenCalled();
  });

  it("reuses cached count when remounted for the same table and filters", async () => {
    const wrapper = createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();
    expect(getTableLength).toHaveBeenCalledTimes(1);

    wrapper.destroy();
    getTableLength.mockClear();

    createWrapper();
    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).not.toHaveBeenCalled();
  });

  it("fetches again on manual click", async () => {
    const wrapper = createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();
    getTableLength.mockClear();

    await wrapper.trigger("click");
    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).toHaveBeenCalledTimes(1);
  });

  it("ignores stale responses when fetches overlap", async () => {
    let resolveFirst: (value: number) => void;
    const firstPromise = new Promise<number>((resolve) => {
      resolveFirst = resolve;
    });

    getTableLength
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(200);

    const wrapper = createWrapper();

    await Vue.nextTick();

    await wrapper.setProps({
      table: { name: "orders", schema: "public" },
    });

    await Vue.nextTick();
    await Vue.nextTick();

    resolveFirst!(100);
    await Vue.nextTick();
    await Vue.nextTick();

    expect(wrapper.text()).toContain("~200");
    expect(wrapper.text()).not.toContain("~100");
  });
});
