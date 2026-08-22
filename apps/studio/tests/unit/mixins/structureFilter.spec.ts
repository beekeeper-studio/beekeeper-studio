import { mount, Wrapper } from "@vue/test-utils";
import { StructureFilterMixin } from "@/mixins/structureFilter";

const COLUMNS = [
  { field: "columnName", title: "Name" },
  { field: "dataType", title: "Type" },
  { field: "trash-button", title: null },
];

/**
 * Stands in for a tabulator instance. The real one can't be built under jest,
 * and everything the mixin touches is on this surface.
 */
function fakeTabulator(initialColumns: any[] = COLUMNS) {
  let columns = initialColumns;
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const allRows = [{ columnName: "id" }, { columnName: "user_name" }, { columnName: "created_at" }];
  const activeRows = [{ columnName: "user_name" }];
  return {
    activeRows,
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

// A stand-in for the structure tab components, which all keep their grid
// in `tabulator` and mix this in to handle the toolbar's search event.
const Host = {
  template: "<div />",
  mixins: [StructureFilterMixin],
  props: ["tabulator"],
};

function mountHost(tabulator: any) {
  return mount(Host, { propsData: { tabulator } });
}

const DEBOUNCE = 250;
const settle = () => new Promise((resolve) => setTimeout(resolve, DEBOUNCE + 80));

async function search(wrapper: Wrapper<any>, query: string) {
  (wrapper.vm as any).setStructureFilterQuery(query);
  await wrapper.vm.$nextTick();
}

describe("StructureFilterMixin", () => {
  it("filters on the searched fields once typing settles", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "user");
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
    const wrapper = mountHost(tabulator);

    for (const value of ["u", "us", "use", "user"]) {
      await search(wrapper, value);
    }
    await settle();

    expect(tabulator.setFilter).toHaveBeenCalledTimes(1);
    expect(tabulator.setFilter.mock.calls[0][1].term).toEqual("user");
    wrapper.destroy();
  });

  it("lowercases and trims the term", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "  User  ");
    await settle();

    expect(tabulator.setFilter.mock.calls[0][1].term).toEqual("user");
    wrapper.destroy();
  });

  it("clears the filter when the query is emptied", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "user");
    await settle();
    await search(wrapper, "");
    await settle();

    expect(tabulator.clearFilter).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as any).structureFilterSuffix).toEqual("");
    wrapper.destroy();
  });

  it("leaves an unfiltered table alone", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "   ");
    await settle();

    expect(tabulator.setFilter).not.toHaveBeenCalled();
    expect(tabulator.clearFilter).not.toHaveBeenCalled();
    wrapper.destroy();
  });

  it("cancels a pending pass when the tab unmounts", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "user");
    wrapper.destroy();
    await settle();

    expect(tabulator.setFilter).not.toHaveBeenCalled();
  });

  it("re-applies to a table the tab rebuilt underneath it", async () => {
    const first = fakeTabulator();
    const wrapper = mountHost(first);

    await search(wrapper, "user");
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
    const wrapper = mountHost(null);

    await search(wrapper, "user");
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

  it("reports how many rows matched through the suffix", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "user");
    await settle();

    expect((wrapper.vm as any).structureFilterSuffix).toEqual("1/3");
    wrapper.destroy();
  });

  it("refreshes the count when the data reloads under an active filter", async () => {
    const tabulator = fakeTabulator();
    const wrapper = mountHost(tabulator);

    await search(wrapper, "user");
    await settle();
    expect((wrapper.vm as any).structureFilterSuffix).toEqual("1/3");

    // replaceData on a filtered table fires dataFiltered
    tabulator.activeRows.length = 0;
    tabulator.fire("dataFiltered", [], []);
    await wrapper.vm.$nextTick();
    expect((wrapper.vm as any).structureFilterSuffix).toEqual("0/3");
    wrapper.destroy();
  });

  it("gives each tab its own debounce timer", async () => {
    const a = fakeTabulator();
    const b = fakeTabulator();
    const wrapperA = mountHost(a);
    const wrapperB = mountHost(b);

    await search(wrapperA, "user");
    await new Promise((resolve) => setTimeout(resolve, 100));
    // a shared timer would cancel the pending call for A
    await search(wrapperB, "type");
    await settle();

    expect(a.setFilter).toHaveBeenCalledTimes(1);
    expect(b.setFilter).toHaveBeenCalledTimes(1);
    wrapperA.destroy();
    wrapperB.destroy();
  });
});
