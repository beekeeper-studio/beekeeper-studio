import { createLocalVue, mount } from "@vue/test-utils";
import TableInfoToolbar from "@/components/tableinfo/TableInfoToolbar.vue";

const localVue = createLocalVue();
localVue.directive("tooltip", {});

function mountToolbar(propsData: Record<string, any> = {}) {
  return mount(TableInfoToolbar, {
    localVue,
    propsData,
    mocks: {
      $bksConfigUI: { getKeybindingLabel: () => "" },
    },
  });
}

describe("TableInfoToolbar", () => {
  it("relays what is typed into the search field", async () => {
    const wrapper = mountToolbar({ filterPlaceholder: "Filter columns" });

    const input = wrapper.find(".table-info-filter input");
    expect(input.attributes("placeholder")).toEqual("Filter columns");

    input.setValue("user");
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("search")).toEqual([["user"]]);
  });

  it("shows the search suffix next to the field", () => {
    const wrapper = mountToolbar({ searchSuffix: "11/14" });
    expect(wrapper.find(".filter-matches").text()).toEqual("11/14");
  });

  it("offers the copy formats in design order", () => {
    const wrapper = mountToolbar();
    const labels = wrapper.findAll("x-menuitem").wrappers.map((w) => w.text());
    expect(labels).toEqual(["Copy as Markdown", "Copy as CSV", "Copy as JSON"]);
  });

  it("emits copy with the chosen format", () => {
    const wrapper = mountToolbar();

    wrapper.findAll("x-menuitem").at(1).trigger("click"); // CSV
    wrapper.findAll("x-menuitem").at(2).trigger("click"); // JSON
    expect(wrapper.emitted("copy")).toEqual([["csv"], ["json"]]);
  });

  it("emits refresh", () => {
    const wrapper = mountToolbar();
    wrapper.find(".refresh-btn").trigger("click");
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("orders the actions refresh, copy, add", () => {
    const wrapper = mountToolbar({ showAdd: true });
    const classes = wrapper
      .findAll(".toolbar-actions > *")
      .wrappers.map((w) => w.classes());
    expect(classes[0]).toContain("refresh-btn");
    expect(classes[1]).toContain("copy-btn");
    expect(classes[2]).toContain("add-btn");
  });

  it("only offers add where the tab supports it", async () => {
    const wrapper = mountToolbar({ showAdd: true, addLabel: "Column" });
    expect(wrapper.find(".add-btn").text()).toEqual("addColumn");
    wrapper.find(".add-btn").trigger("click");
    expect(wrapper.emitted("add")).toHaveLength(1);

    wrapper.setProps({ showAdd: false });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".add-btn").exists()).toBe(false);
  });
});
