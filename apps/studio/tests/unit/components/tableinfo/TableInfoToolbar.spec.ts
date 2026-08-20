import { createLocalVue, mount } from "@vue/test-utils";
import TableInfoToolbar from "@/components/tableinfo/TableInfoToolbar.vue";

const COLUMNS = [
  { field: "columnName", title: "Name" },
  { field: "dataType", title: "Type" },
  { field: "trash-button", title: null },
];

const ALL_ROWS = [
  { columnName: "id", dataType: "int4" },
  { columnName: "user_name", dataType: "varchar(255)" },
  { columnName: "created_at", dataType: "timestamptz" },
];

// what's on screen: filtered down to one row
const ACTIVE_ROWS = [{ columnName: "user_name", dataType: "varchar(255)" }];

function fakeTabulator() {
  return {
    setFilter: jest.fn(),
    clearFilter: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getData: (mode?: string) => (mode === "active" ? ACTIVE_ROWS : ALL_ROWS),
    getColumns: () =>
      COLUMNS.map((c) => ({ isVisible: () => true, getDefinition: () => c })),
  };
}

const localVue = createLocalVue();
localVue.directive("tooltip", {});

function mountToolbar(propsData: Record<string, any>) {
  return mount(TableInfoToolbar, {
    localVue,
    propsData: { title: "Columns", ...propsData },
    mocks: {
      $bksConfigUI: { getKeybindingLabel: () => "" },
    },
  });
}

describe("TableInfoToolbar", () => {
  it("renders the tab title", () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator() });
    expect(wrapper.find(".toolbar-title h2").text()).toEqual("Columns");
  });

  it("opens the search in place of the icon, and closes back to it", async () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator() });

    // collapsed by default: icon only, no field
    expect(wrapper.find(".search-btn").exists()).toBe(true);
    expect(wrapper.find(".table-info-filter").exists()).toBe(false);

    wrapper.find(".search-btn").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".search-btn").exists()).toBe(false);
    expect(wrapper.find(".table-info-filter").exists()).toBe(true);

    wrapper.find(".table-info-filter input").trigger("keydown.esc");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".table-info-filter").exists()).toBe(false);
    expect(wrapper.find(".search-btn").exists()).toBe(true);
  });

  it("offers the copy formats in design order", () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator() });
    const labels = wrapper.findAll("x-menuitem").wrappers.map((w) => w.text());
    expect(labels).toEqual(["Copy as Markdown", "Copy as CSV", "Copy as JSON"]);
  });

  it("emits copy with the chosen format", () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator() });

    wrapper.findAll("x-menuitem").at(1).trigger("click"); // CSV
    wrapper.findAll("x-menuitem").at(2).trigger("click"); // JSON
    expect(wrapper.emitted("copy")).toEqual([["csv"], ["json"]]);
  });

  it("emits refresh", () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator() });
    wrapper.find(".refresh-btn").trigger("click");
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("orders the actions refresh, copy, add", () => {
    const wrapper = mountToolbar({ tabulator: fakeTabulator(), showAdd: true });
    const classes = wrapper
      .findAll(".toolbar-actions > *")
      .wrappers.map((w) => w.classes());
    expect(classes[0]).toContain("refresh-btn");
    expect(classes[1]).toContain("copy-btn");
    expect(classes[2]).toContain("add-btn");
  });

  it("only offers add where the tab supports it", async () => {
    const wrapper = mountToolbar({
      tabulator: fakeTabulator(),
      showAdd: true,
      addLabel: "Column",
    });
    expect(wrapper.find(".add-btn").text()).toEqual("addColumn");
    wrapper.find(".add-btn").trigger("click");
    expect(wrapper.emitted("add")).toHaveLength(1);

    wrapper.setProps({ showAdd: false });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".add-btn").exists()).toBe(false);
  });
});
