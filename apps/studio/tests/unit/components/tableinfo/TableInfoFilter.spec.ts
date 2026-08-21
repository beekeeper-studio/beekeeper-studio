import { mount, Wrapper } from "@vue/test-utils";
import TableInfoFilter from "@/components/tableinfo/TableInfoFilter.vue";

async function type(wrapper: Wrapper<any>, value: string) {
  wrapper.find("input").setValue(value);
  await wrapper.vm.$nextTick();
}

describe("TableInfoFilter", () => {
  it("emits search with the raw text as the user types", async () => {
    const wrapper = mount(TableInfoFilter);

    await type(wrapper, "  User ");
    // trimming and matching are the grid owner's business, not the input's
    expect(wrapper.emitted("search")).toEqual([["  User "]]);
    wrapper.destroy();
  });

  it("clears and emits an empty search from the clear button", async () => {
    const wrapper = mount(TableInfoFilter);

    await type(wrapper, "user");
    wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();

    expect((wrapper.find("input").element as HTMLInputElement).value).toEqual("");
    expect(wrapper.emitted("search")).toEqual([["user"], [""]]);
    wrapper.destroy();
  });

  it("clears on escape", async () => {
    const wrapper = mount(TableInfoFilter);

    await type(wrapper, "user");
    wrapper.find("input").trigger("keydown.esc");
    await wrapper.vm.$nextTick();

    expect((wrapper.find("input").element as HTMLInputElement).value).toEqual("");
    expect(wrapper.emitted("search")).toEqual([["user"], [""]]);
    wrapper.destroy();
  });

  it("shows the suffix it is given", async () => {
    const wrapper = mount(TableInfoFilter, { propsData: { suffix: "11/14" } });
    expect(wrapper.find(".filter-matches").text()).toEqual("11/14");
    wrapper.destroy();
  });

  it("hides the suffix and clear button with visibility so the input never shifts", async () => {
    const wrapper = mount(TableInfoFilter);

    // present but invisible while empty -- their slots are always reserved
    expect(wrapper.find(".clear-filter").exists()).toBe(true);
    expect(wrapper.find(".clear-filter").classes()).toContain("is-hidden");
    expect(wrapper.find(".filter-matches").exists()).toBe(true);
    expect(wrapper.find(".filter-matches").classes()).toContain("is-hidden");

    await type(wrapper, "user");
    expect(wrapper.find(".clear-filter").classes()).not.toContain("is-hidden");

    wrapper.setProps({ suffix: "1/3" });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".filter-matches").classes()).not.toContain("is-hidden");
    wrapper.destroy();
  });
});
