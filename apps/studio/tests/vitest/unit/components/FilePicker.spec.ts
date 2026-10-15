import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import FilePicker from "@/components/common/form/FilePicker.vue";

function mountPicker(propsData: Record<string, unknown>) {
  const dialog = {
    showOpenDialogSync: vi.fn(() => ["/picked/open.db"]),
    showSaveDialogSync: vi.fn(() => "/picked/save.db"),
    showCreateFileDialogSync: vi.fn(() => "/picked/created.db"),
  };
  const wrapper = mount(FilePicker, {
    propsData: { value: "", showCreateButton: true, ...propsData },
    mocks: { $native: { dialog } },
  });
  return { wrapper, dialog };
}

function clickCreate(wrapper: ReturnType<typeof mountPicker>["wrapper"]) {
  const create = wrapper.findAll("a").filter((a) => a.text() === "Create").at(0);
  return create.trigger("click");
}

describe("FilePicker Create button", () => {
  // A SQLite connection refuses a file that does not exist, so the picker has
  // to create the file it picks (#4854).
  it("creates the file it picks with create-file", async () => {
    const { wrapper, dialog } = mountPicker({ createFile: true });

    await clickCreate(wrapper);

    expect(dialog.showCreateFileDialogSync).toHaveBeenCalledTimes(1);
    expect(dialog.showSaveDialogSync).not.toHaveBeenCalled();
    expect(wrapper.emitted("input")).toEqual([["/picked/created.db"]]);
    wrapper.destroy();
  });

  // DuckDB creates its own file on connect.
  it("only picks a path without create-file", async () => {
    const { wrapper, dialog } = mountPicker({});

    await clickCreate(wrapper);

    expect(dialog.showSaveDialogSync).toHaveBeenCalledTimes(1);
    expect(dialog.showCreateFileDialogSync).not.toHaveBeenCalled();
    expect(wrapper.emitted("input")).toEqual([["/picked/save.db"]]);
    wrapper.destroy();
  });

  it("opens an existing file with Choose File, create-file or not", async () => {
    const { wrapper, dialog } = mountPicker({ createFile: true });

    await wrapper.find(".input-group-append").trigger("click");

    expect(dialog.showOpenDialogSync).toHaveBeenCalledTimes(1);
    expect(dialog.showCreateFileDialogSync).not.toHaveBeenCalled();
    expect(wrapper.emitted("input")).toEqual([["/picked/open.db"]]);
    wrapper.destroy();
  });
});
