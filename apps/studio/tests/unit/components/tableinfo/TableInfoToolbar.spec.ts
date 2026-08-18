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
  const writeText = jest.fn();
  const wrapper = mount(TableInfoToolbar, {
    localVue,
    propsData,
    mocks: {
      $native: { clipboard: { writeText } },
      $bksConfigUI: { getKeybindingLabel: () => "" },
    },
  });
  return { wrapper, writeText };
}

describe("TableInfoToolbar", () => {
  it("offers the copy formats in design order", () => {
    const { wrapper } = mountToolbar({ tabulator: fakeTabulator() });
    const labels = wrapper.findAll("x-menuitem").wrappers.map((w) => w.text());
    expect(labels).toEqual(["Copy as Markdown", "Copy as CSV", "Copy as JSON"]);
  });

  it("copies the grid as shown on screen, not the full data set", () => {
    const { wrapper, writeText } = mountToolbar({ tabulator: fakeTabulator() });

    wrapper.findAll("x-menuitem").at(1).trigger("click"); // CSV
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toEqual(
      "Name,Type\r\nuser_name,varchar(255)"
    );
  });

  it("copies json keyed by column titles", () => {
    const { wrapper, writeText } = mountToolbar({ tabulator: fakeTabulator() });

    wrapper.findAll("x-menuitem").at(2).trigger("click"); // JSON
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual([
      { Name: "user_name", Type: "varchar(255)" },
    ]);
  });

  it("does nothing when the table isn't mounted yet", () => {
    const { wrapper, writeText } = mountToolbar({ tabulator: null });
    wrapper.findAll("x-menuitem").at(0).trigger("click");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("emits refresh", () => {
    const { wrapper } = mountToolbar({ tabulator: fakeTabulator() });
    wrapper.find(".refresh-btn").trigger("click");
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("only offers add where the tab supports it", async () => {
    const { wrapper } = mountToolbar({
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
    expect(wrapper.find(".toolbar-divider").exists()).toBe(false);
  });

  it("relays match counts from the filter", async () => {
    const { wrapper } = mountToolbar({ tabulator: fakeTabulator() });

    wrapper.find("input").setValue("user");
    await new Promise((resolve) => setTimeout(resolve, 330));

    const emitted = wrapper.emitted("matches");
    expect(emitted[emitted.length - 1]).toEqual([{ matched: 1, total: 3 }]);
  });
});
