import { mount, Wrapper } from "@vue/test-utils";
import TableInfoFilter from "@/components/tableinfo/TableInfoFilter.vue";

const COLUMNS = [
  { field: "columnName", title: "Name" },
  { field: "dataType", title: "Type" },
  { field: "trash-button", title: null },
];

/**
 * Stands in for a tabulator instance. The real one can't be built under jest,
 * and everything this component touches is on this surface.
 */
function fakeTabulator(initialColumns: any[] = COLUMNS) {
  let columns = initialColumns;
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const allRows = [{ columnName: "id" }, { columnName: "user_name" }, { columnName: "created_at" }];
  const activeRows = [{ columnName: "user_name" }];
  return {
    setFilter: jest.fn(),
    clearFilter: jest.fn(),
    on(event: string, callback: (...args: any[]) => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
    },
    off(event: string, callback: (...args: any[]) => void) {
      listeners[event] = (listeners[event] || []).filter((c) => c !== callback);
    },
    getData(mode?: string) {
      return mode === "active" ? activeRows : allRows;
    },
    getColumns: () =>
      columns.map((c) => ({ isVisible: () => true, getDefinition: () => c })),
    // test helpers, not part of the tabulator api
    finishBuilding(built: any[] = COLUMNS) {
      columns = built;
      (listeners.tableBuilt || []).forEach((callback) => callback());
    },
    fire(event: string, ...args: any[]) {
      (listeners[event] || []).forEach((callback) => callback(...args));
    },
  };
}

const DEBOUNCE = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, DEBOUNCE + 80));

async function type(wrapper: Wrapper<any>, value: string) {
  wrapper.find("input").setValue(value);
  await wrapper.vm.$nextTick();
}

describe("TableInfoFilter", () => {
  it("filters on the searched fields once typing settles", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    expect(tabulator.setFilter).not.toHaveBeenCalled();

    await settle();
    expect(tabulator.setFilter).toHaveBeenCalledTimes(1);
    const [, params] = tabulator.setFilter.mock.calls[0];
    // trash-button is not a searchable field
    expect(params).toEqual({ term: "user", fields: ["columnName", "dataType"] });
    wrapper.destroy();
  });

  it("collapses rapid typing into a single pass", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    for (const value of ["u", "us", "use", "user"]) {
      await type(wrapper, value);
    }
    await settle();

    expect(tabulator.setFilter).toHaveBeenCalledTimes(1);
    expect(tabulator.setFilter.mock.calls[0][1].term).toEqual("user");
    wrapper.destroy();
  });

  it("lowercases and trims the term", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "  User  ");
    await settle();

    expect(tabulator.setFilter.mock.calls[0][1].term).toEqual("user");
    wrapper.destroy();
  });

  it("clears the filter as soon as the clear button is clicked", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    await settle();

    wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    expect(tabulator.clearFilter).toHaveBeenCalledTimes(1);

    // the queued debounce must not put the filter back
    await settle();
    expect(tabulator.setFilter).toHaveBeenCalledTimes(1);
    expect(tabulator.clearFilter).toHaveBeenCalledTimes(1);
    wrapper.destroy();
  });

  it("clears the filter when the input is emptied", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    await settle();
    await type(wrapper, "");
    await settle();

    expect(tabulator.clearFilter).toHaveBeenCalledTimes(1);
    wrapper.destroy();
  });

  it("leaves an unfiltered table alone", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "   ");
    await settle();

    expect(tabulator.setFilter).not.toHaveBeenCalled();
    expect(tabulator.clearFilter).not.toHaveBeenCalled();
    wrapper.destroy();
  });

  it("re-applies to a table the tab rebuilt underneath it", async () => {
    const first = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator: first } });

    await type(wrapper, "user");
    await settle();
    expect(first.setFilter).toHaveBeenCalledTimes(1);

    const second = fakeTabulator();
    wrapper.setProps({ tabulator: second });
    await wrapper.vm.$nextTick();

    expect(second.setFilter).toHaveBeenCalledTimes(1);
    expect(second.setFilter.mock.calls[0][1].term).toEqual("user");
    wrapper.destroy();
  });

  it("waits for a still-building table instead of filtering on no columns", async () => {
    // filtering on an empty field list would match nothing and hide every row
    const tabulator = fakeTabulator([]);
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator: null } });

    await type(wrapper, "user");
    await settle();

    wrapper.setProps({ tabulator });
    await wrapper.vm.$nextTick();
    expect(tabulator.setFilter).not.toHaveBeenCalled();

    tabulator.finishBuilding();
    expect(tabulator.setFilter).toHaveBeenCalledTimes(1);
    expect(tabulator.setFilter.mock.calls[0][1].fields).toEqual([
      "columnName",
      "dataType",
    ]);
    wrapper.destroy();
  });

  it("keeps the clear button in the layout so the box width never changes", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    // present but invisible while empty -- its 16px slot is always reserved
    expect(wrapper.find(".clear-filter").exists()).toBe(true);
    expect(wrapper.find(".clear-filter").classes()).toContain("is-hidden");

    await type(wrapper, "user");
    expect(wrapper.find(".clear-filter").classes()).not.toContain("is-hidden");
    wrapper.destroy();
  });

  it("reports how many rows matched", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    await settle();

    const emitted = wrapper.emitted("matches");
    expect(emitted[emitted.length - 1]).toEqual([{ matched: 1, total: 3 }]);
    wrapper.destroy();
  });

  it("reports null once the filter is cleared", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    await settle();
    wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();

    const emitted = wrapper.emitted("matches");
    expect(emitted[emitted.length - 1]).toEqual([null]);
    wrapper.destroy();
  });

  it("refreshes the count when the data reloads under an active filter", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mount(TableInfoFilter, { propsData: { tabulator } });

    await type(wrapper, "user");
    await settle();
    const countBefore = wrapper.emitted("matches").length;

    // replaceData on a filtered table fires dataFiltered
    tabulator.fire("dataFiltered", [], []);
    expect(wrapper.emitted("matches").length).toEqual(countBefore + 1);

    // but not when no filter is applied
    wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    const countAfterClear = wrapper.emitted("matches").length;
    tabulator.fire("dataFiltered", [], []);
    expect(wrapper.emitted("matches").length).toEqual(countAfterClear);
    wrapper.destroy();
  });

  it("gives each tab its own debounce timer", async () => {
    const a = fakeTabulator();
    const b = fakeTabulator();
    const wrapperA = mount(TableInfoFilter, { propsData: { tabulator: a } });
    const wrapperB = mount(TableInfoFilter, { propsData: { tabulator: b } });

    await type(wrapperA, "user");
    await new Promise((resolve) => setTimeout(resolve, 100));
    // a shared timer would cancel the pending call for A
    await type(wrapperB, "type");
    await settle();

    expect(a.setFilter).toHaveBeenCalledTimes(1);
    expect(b.setFilter).toHaveBeenCalledTimes(1);
    wrapperA.destroy();
    wrapperB.destroy();
  });
});
