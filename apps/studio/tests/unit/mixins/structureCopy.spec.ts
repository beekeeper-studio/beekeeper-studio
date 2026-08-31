import { mount } from "@vue/test-utils";
import { StructureCopyMixin } from "@/mixins/structureCopy";

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
    getData: (mode?: string) => (mode === "active" ? ACTIVE_ROWS : ALL_ROWS),
    getColumns: () =>
      COLUMNS.map((c) => ({ isVisible: () => true, getDefinition: () => c })),
  };
}

// A stand-in for the structure tab components, which all keep their grid
// in `tabulator` and mix this in to handle the toolbar's copy event.
const Host = {
  template: "<div />",
  mixins: [StructureCopyMixin],
  props: ["tabulator"],
};

function mountHost(tabulator: any) {
  const writeText = jest.fn();
  const wrapper = mount(Host, {
    propsData: { tabulator },
    mocks: {
      $native: { clipboard: { writeText } },
    },
  });
  return { wrapper, writeText };
}

describe("StructureCopyMixin", () => {
  it("copies the grid as shown on screen, not the full data set", () => {
    const { wrapper, writeText } = mountHost(fakeTabulator());

    (wrapper.vm as any).copyStructure("csv");
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toEqual(
      "Name,Type\r\nuser_name,varchar(255)"
    );
  });

  it("copies json keyed by column titles", () => {
    const { wrapper, writeText } = mountHost(fakeTabulator());

    (wrapper.vm as any).copyStructure("json");
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual([
      { Name: "user_name", Type: "varchar(255)" },
    ]);
  });

  it("does nothing when the table isn't mounted yet", () => {
    const { wrapper, writeText } = mountHost(null);
    (wrapper.vm as any).copyStructure("markdown");
    expect(writeText).not.toHaveBeenCalled();
  });
});
