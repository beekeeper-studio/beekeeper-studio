import { describe, it, expect, vi, beforeEach } from "vitest";
import { pluralize } from "@/vendor/pluralize";
import CoreTabs from "@/components/CoreTabs.vue";

const { handleWindowClose, resolveConfirmWindowClose } = (CoreTabs as any).options.methods;
const confirmsWindowClose = (CoreTabs as any).options.computed.confirmsWindowClose;

function context(overrides: Record<string, any> = {}) {
  return {
    tabs: [],
    settings: {},
    dontConfirmWindowCloseAgain: false,
    confirmWindowCloseMessage: "",
    confirmWindowCloseModalId: "core-tabs-confirm-window-close",
    confirmWindowCloseResolve: null,
    $pluralize: pluralize,
    $modal: { show: vi.fn(), hide: vi.fn() },
    ...overrides,
  };
}

const dirtyTab = () => ({ unsavedChanges: true });
const cleanTab = () => ({ unsavedChanges: false });

describe("CoreTabs confirmsWindowClose", () => {
  it("is off without unsaved tabs", () => {
    expect(confirmsWindowClose.call(context({ tabs: [cleanTab()] }))).toBe(false);
  });

  it("is on with an unsaved tab", () => {
    expect(confirmsWindowClose.call(context({ tabs: [cleanTab(), dirtyTab()] }))).toBe(true);
  });

  it("is off after \"Don't show this again\"", () => {
    const vm = context({ tabs: [dirtyTab()], settings: { dontConfirmWindowClose: { value: true } } });
    expect(confirmsWindowClose.call(vm)).toBe(false);
  });
});

describe("CoreTabs handleWindowClose", () => {
  let preventClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    preventClose = vi.fn();
    (globalThis as any).window.main = { setConfirmWindowClose: vi.fn().mockResolvedValue(undefined) };
  });

  it("does not ask without unsaved tabs", async () => {
    const vm = context({ tabs: [cleanTab()] });

    await handleWindowClose.call(vm, { preventClose });

    expect(vm.$modal.show).not.toHaveBeenCalled();
    expect(preventClose).not.toHaveBeenCalled();
  });

  it("asks with the number of unsaved tabs and an unticked checkbox", async () => {
    const vm = context({ tabs: [dirtyTab(), cleanTab()], dontConfirmWindowCloseAgain: true });

    const closing = handleWindowClose.call(vm, { preventClose });
    expect(vm.$modal.show).toHaveBeenCalledWith(vm.confirmWindowCloseModalId);
    expect(vm.confirmWindowCloseMessage).toBe("You have 1 unsaved tab. Are you sure?");
    expect(vm.dontConfirmWindowCloseAgain).toBe(false);

    resolveConfirmWindowClose.call(vm, true);
    await closing;
    expect(preventClose).not.toHaveBeenCalled();
  });

  it("prevents the close on cancel and ignores the checkbox", async () => {
    const vm = context({ tabs: [dirtyTab()] });

    const closing = handleWindowClose.call(vm, { preventClose });
    vm.dontConfirmWindowCloseAgain = true;
    resolveConfirmWindowClose.call(vm, false);
    await closing;

    expect(preventClose).toHaveBeenCalled();
    expect(window.main.setConfirmWindowClose).not.toHaveBeenCalled();
  });

  it("turns the prompt off when closing with the checkbox ticked", async () => {
    const vm = context({ tabs: [dirtyTab()] });

    const closing = handleWindowClose.call(vm, { preventClose });
    vm.dontConfirmWindowCloseAgain = true;
    resolveConfirmWindowClose.call(vm, true);
    await closing;

    expect(window.main.setConfirmWindowClose).toHaveBeenCalledWith(false);
    expect(preventClose).not.toHaveBeenCalled();
  });

  it("still closes when saving the checkbox fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    window.main.setConfirmWindowClose = vi.fn().mockRejectedValue(new Error("db is locked"));
    const vm = context({ tabs: [dirtyTab()] });

    const closing = handleWindowClose.call(vm, { preventClose });
    vm.dontConfirmWindowCloseAgain = true;
    resolveConfirmWindowClose.call(vm, true);
    await closing;

    expect(preventClose).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("settles the modal only once", () => {
    const resolve = vi.fn();
    const vm = context({ confirmWindowCloseResolve: resolve });

    resolveConfirmWindowClose.call(vm, true);
    resolveConfirmWindowClose.call(vm, false);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith(true);
  });
});
