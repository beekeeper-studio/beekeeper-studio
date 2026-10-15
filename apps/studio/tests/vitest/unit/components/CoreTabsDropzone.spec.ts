import { describe, it, expect, vi, afterEach } from "vitest";
import CoreTabs from "@/components/CoreTabs.vue";
import { AppEvent } from "@/common/AppEvent";
import { MAX_QUERY_LENGTH, MAX_QUERY_FILE_BYTES } from "@/common/utils";

// Dragging a ~200MB data dump onto the editor used to read the whole file into
// a query tab. The tab is saved, so the app froze again every time the
// connection was reopened (#4862). Exercise the method directly - mounting
// CoreTabs would drag in the whole tab surface.
const handleDropzoneDrop = (CoreTabs as any).options.methods.handleDropzoneDrop;

function context(): any {
  const loading = document.createElement("div");
  loading.innerHTML = '<span class="counter"></span>';
  return {
    $root: { $emit: vi.fn() },
    $noty: {
      info: vi.fn(() => ({ barDom: loading, close: vi.fn() })),
      error: vi.fn(),
      success: vi.fn(),
    },
  };
}

function drop(vm: ReturnType<typeof context>, files: File[]) {
  return handleDropzoneDrop.call(vm, { event: {} as DragEvent, files });
}

function fileOfSize(name: string, size: number) {
  const file = new File(["select 1"], name);
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("CoreTabs file drop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a dropped sql file in a new query tab", async () => {
    const vm = context();

    await drop(vm, [new File(["select 1"], "a.sql")]);

    expect(vm.$root.$emit).toHaveBeenCalledWith(AppEvent.newTab, "select 1");
    expect(vm.$noty.success).toHaveBeenCalled();
    expect(vm.$noty.error).not.toHaveBeenCalled();
  });

  it("does not read a file that is over the size limit", async () => {
    const vm = context();
    const readAsText = vi.spyOn(FileReader.prototype, "readAsText");

    await drop(vm, [fileOfSize("dump.sql", 200 * 1024 * 1024)]);

    expect(readAsText).not.toHaveBeenCalled();
    expect(vm.$root.$emit).not.toHaveBeenCalled();
    expect(vm.$noty.error).toHaveBeenCalledWith(
      expect.stringContaining("dump.sql"),
      expect.anything()
    );
    expect(vm.$noty.success).not.toHaveBeenCalled();
  });

  it("reads a file right at the size limit", async () => {
    const vm = context();

    await drop(vm, [fileOfSize("edge.sql", MAX_QUERY_FILE_BYTES)]);

    expect(vm.$root.$emit).toHaveBeenCalledWith(AppEvent.newTab, "select 1");
  });

  it("does not open a file whose text is over the character limit", async () => {
    const vm = context();

    await drop(vm, [new File(["x".repeat(MAX_QUERY_LENGTH + 1)], "long.sql")]);

    expect(vm.$root.$emit).not.toHaveBeenCalled();
    expect(vm.$noty.error).toHaveBeenCalledWith(
      expect.stringContaining("long.sql"),
      expect.anything()
    );
  });

  it("still opens the files that fit when one is too large", async () => {
    const vm = context();

    await drop(vm, [
      fileOfSize("dump.sql", MAX_QUERY_FILE_BYTES + 1),
      new File(["select 2"], "b.sql"),
    ]);

    expect(vm.$root.$emit).toHaveBeenCalledTimes(1);
    expect(vm.$root.$emit).toHaveBeenCalledWith(AppEvent.newTab, "select 2");
    expect(vm.$noty.error).toHaveBeenCalledTimes(1);
    expect(vm.$noty.error.mock.calls[0][0]).toContain("dump.sql");
    expect(vm.$noty.error.mock.calls[0][0]).not.toContain("b.sql");
  });

  // The Abort button passed FileReader.abort unbound, which throws
  // "Illegal invocation", so loading could never be cancelled.
  it("stops loading when Abort is clicked", async () => {
    const vm = context();

    const pending = drop(vm, [
      new File(["select 1"], "a.sql"),
      new File(["select 2"], "b.sql"),
    ]);
    const [abortButton] = vm.$noty.info.mock.calls[0][1].buttons;
    expect(() => abortButton.cb()).not.toThrow();
    await pending;

    expect(vm.$root.$emit).not.toHaveBeenCalled();
    expect(vm.$noty.info).toHaveBeenLastCalledWith("Loading aborted", expect.anything());
  });
});
