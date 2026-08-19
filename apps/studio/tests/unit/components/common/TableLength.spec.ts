import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TableLength from "@/components/common/TableLength.vue";
import { clearRecordCountCache } from "@/components/common/tableLengthCache";

Vue.use(Vuex);

function createBksConfig(
  autoFetchRecordCount = true,
  autoFetchFilteredRecordCount = false
) {
  return {
    db: {
      postgres: { autoFetchRecordCount, autoFetchFilteredRecordCount },
      default: {
        autoFetchRecordCount: false,
        autoFetchFilteredRecordCount: false,
      },
    },
  };
}

describe("TableLength.vue", () => {
  const table = { name: "users", schema: "public" };

  let getTableLength: jest.Mock;
  let getFilteredDataCount: jest.Mock;
  let getQueryForFilter: jest.Mock;
  let store: Vuex.Store<unknown>;
  let bksConfig: ReturnType<typeof createBksConfig>;

  function createWrapper(
    props: Record<string, unknown> = {},
    options: {
      autoFetchRecordCount?: boolean;
      autoFetchFilteredRecordCount?: boolean;
    } = {}
  ) {
    const autoFetch = options.autoFetchRecordCount ?? true;
    const autoFetchFiltered = options.autoFetchFilteredRecordCount ?? false;
    bksConfig = createBksConfig(autoFetch, autoFetchFiltered);

    return mount(TableLength, {
      store,
      mocks: {
        $bksConfig: bksConfig,
      },
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
        connectionType: "postgresql",
      },
    });
  });

  it("fetches total records automatically on mount when auto-fetch is enabled", async () => {
    createWrapper();

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).toHaveBeenCalledWith("users", "public");
  });

  it("does not auto-fetch on mount when autoFetchRecordCount is false", async () => {
    createWrapper({}, { autoFetchRecordCount: false });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).not.toHaveBeenCalled();
  });

  it("auto-fetches the filtered count when autoFetchFilteredRecordCount is enabled", async () => {
    const wrapper = createWrapper(
      { filters: [] },
      { autoFetchFilteredRecordCount: true }
    );

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

  it("does not auto-fetch filtered count when autoFetchFilteredRecordCount is disabled", async () => {
    const wrapper = createWrapper({ filters: [] });

    await Vue.nextTick();
    await Vue.nextTick();
    getTableLength.mockClear();

    await wrapper.setProps({
      filters: [{ field: "id", type: "=", value: "1" }],
    });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getQueryForFilter).not.toHaveBeenCalled();
    expect(getFilteredDataCount).not.toHaveBeenCalled();
    expect(getTableLength).not.toHaveBeenCalled();
  });

  it("does not auto-fetch filtered count when autoFetchRecordCount is disabled even if filtered auto-fetch is enabled", async () => {
    const wrapper = createWrapper(
      { filters: [] },
      { autoFetchRecordCount: false, autoFetchFilteredRecordCount: true }
    );

    await Vue.nextTick();
    await Vue.nextTick();

    await wrapper.setProps({
      filters: [{ field: "id", type: "=", value: "1" }],
    });

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getQueryForFilter).not.toHaveBeenCalled();
    expect(getFilteredDataCount).not.toHaveBeenCalled();
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

  it("fetches on manual click when auto-fetch is disabled", async () => {
    const wrapper = createWrapper({}, { autoFetchRecordCount: false });

    await Vue.nextTick();
    await Vue.nextTick();
    expect(getTableLength).not.toHaveBeenCalled();

    await wrapper.trigger("click");
    await Vue.nextTick();
    await Vue.nextTick();

    expect(getTableLength).toHaveBeenCalledWith("users", "public");
  });

  it("fetches filtered count on manual click when filters are active", async () => {
    const wrapper = createWrapper(
      { filters: [{ field: "id", type: "=", value: "1" }] },
      { autoFetchRecordCount: false }
    );

    await Vue.nextTick();
    await Vue.nextTick();

    expect(getFilteredDataCount).not.toHaveBeenCalled();

    await wrapper.trigger("click");
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
