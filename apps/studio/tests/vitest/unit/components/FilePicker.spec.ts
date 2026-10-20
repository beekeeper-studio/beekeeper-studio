import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import FilePicker from "@/components/common/form/FilePicker.vue";

function mountPicker(propsData: Record<string, unknown>, dialogOverrides: Record<string, unknown> = {}) {
  const dialog = {
    showOpenDialogSync: vi.fn(() => ["/picked/open.db"]),
    showSaveDialogSync: vi.fn(() => "/picked/save.db"),
    ...dialogOverrides,
  };
  const wrapper = mount(FilePicker, {
    propsData: { value: "", showCreateButton: true, ...propsData },
    mocks: { $native: { dialog } },
  });
  return { wrapper, dialog };
}

function button(wrapper: ReturnType<typeof mountPicker>["wrapper"], text: string) {
  return wrapper.findAll("a").filter((a) => a.text() === text);
}

// SqliteForm tells a file to create (#4854) from an existing one by these
// events, and locks the path until it is cleared.
describe("FilePicker", () => {
  it("emits create for a path picked with Create", async () => {
    const { wrapper, dialog } = mountPicker({});

    await button(wrapper, "Create").at(0).trigger("click");

    expect(dialog.showSaveDialogSync).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("input")).toEqual([["/picked/save.db"]]);
    expect(wrapper.emitted("create")).toEqual([["/picked/save.db"]]);
    expect(wrapper.emitted("choose")).toBeUndefined();
    wrapper.destroy();
  });

  it("emits choose for a path picked with Choose File", async () => {
    const { wrapper, dialog } = mountPicker({});

    await wrapper.find(".input-group-append").trigger("click");

    expect(dialog.showOpenDialogSync).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("input")).toEqual([["/picked/open.db"]]);
    expect(wrapper.emitted("choose")).toEqual([["/picked/open.db"]]);
    expect(wrapper.emitted("create")).toBeUndefined();
    wrapper.destroy();
  });

  it("leaves the path alone when the Create dialog is cancelled", async () => {
    const { wrapper } = mountPicker(
      { value: "/existing.db" },
      { showSaveDialogSync: vi.fn(() => undefined) }
    );

    await button(wrapper, "Create").at(0).trigger("click");

    expect(wrapper.emitted("input")).toBeUndefined();
    expect(wrapper.emitted("create")).toBeUndefined();
    wrapper.destroy();
  });

  it("shows a clear button only when clearable and there is a path", () => {
    const empty = mountPicker({ clearable: true }).wrapper;
    const notClearable = mountPicker({ value: "/created.db" }).wrapper;
    const clearable = mountPicker({ clearable: true, value: "/created.db" }).wrapper;

    expect(button(empty, "close").length).toBe(0);
    expect(button(notClearable, "close").length).toBe(0);
    expect(button(clearable, "close").length).toBe(1);
    [empty, notClearable, clearable].forEach((w) => w.destroy());
  });

  it("empties the path and emits clear from the clear button", async () => {
    const { wrapper, dialog } = mountPicker({ clearable: true, value: "/created.db" });

    await button(wrapper, "close").at(0).trigger("click");

    expect(wrapper.emitted("input")).toEqual([[""]]);
    expect(wrapper.emitted("clear")).toHaveLength(1);
    expect(dialog.showOpenDialogSync).not.toHaveBeenCalled();
    wrapper.destroy();
  });
});
