import { describe, it, expect, vi, beforeEach } from "vitest";
import { pluralize } from "@/vendor/pluralize";
import CoreTabs from "@/components/CoreTabs.vue";

// Bound to a plain context object rather than mounting CoreTabs - mounting
// would drag in the whole tab surface for logic that only touches
// `this.tabs` and `this.$modal`.
const confirmWindowClose = (CoreTabs as any).options.methods.confirmWindowClose;
const resolveConfirmWindowClose = (CoreTabs as any).options.methods.resolveConfirmWindowClose;

function context(overrides: Record<string, any> = {}) {
  return {
    tabs: [],
    dontConfirmWindowCloseAgain: false,
    confirmWindowCloseMessage: "",
    confirmWindowCloseModalId: "core-tabs-confirm-window-close",
    confirmWindowCloseResolve: null,
    $pluralize: pluralize,
    $modal: { show: vi.fn(), hide: vi.fn() },
    ...overrides,
  };
}

const dirtyTab = () => ({ unsavedChanges: true, title: "Query #1" });
const cleanTab = () => ({ unsavedChanges: false, title: "Query #2" });

describe("CoreTabs confirmWindowClose", () => {
  beforeEach(() => {
    (globalThis as any).window.main = {
      ackConfirmWindowClose: vi.fn(),
      respondConfirmWindowClose: vi.fn(),
    };
  });

  it("acks, then answers without showing the modal when there are no unsaved tabs", async () => {
    const vm = context({ tabs: [cleanTab(), cleanTab()] });

    await confirmWindowClose.call(vm);

    expect(window.main.ackConfirmWindowClose).toHaveBeenCalled();
    expect(vm.$modal.show).not.toHaveBeenCalled();
    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(true, false);
  });

  it("shows its own modal (not $confirm) when there are unsaved tabs, with the right message", async () => {
    const vm = context({ tabs: [dirtyTab(), cleanTab()] });

    const promise = confirmWindowClose.call(vm);
    // The method runs synchronously up to the `await new Promise(...)` that
    // waits on the modal, so by here $modal.show has already been called.
    expect(vm.$modal.show).toHaveBeenCalledWith(vm.confirmWindowCloseModalId);
    expect(vm.confirmWindowCloseMessage).toBe("You have 1 unsaved tab. Are you sure?");

    resolveConfirmWindowClose.call(vm, true);
    await promise;

    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(true, false);
  });

  it("starts every prompt with the checkbox unticked", async () => {
    const vm = context({ tabs: [dirtyTab()], dontConfirmWindowCloseAgain: true });

    const promise = confirmWindowClose.call(vm);
    expect(vm.dontConfirmWindowCloseAgain).toBe(false);

    resolveConfirmWindowClose.call(vm, false);
    await promise;
  });

  it("answers false when the user cancels, and drops a ticked checkbox", async () => {
    const vm = context({ tabs: [dirtyTab()] });

    const promise = confirmWindowClose.call(vm);
    vm.dontConfirmWindowCloseAgain = true; // ticked, but then cancelled below
    resolveConfirmWindowClose.call(vm, false);
    await promise;

    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(false, false);
  });

  it("passes 'Don't show this again' on to main when the user closes with it ticked", async () => {
    const vm = context({ tabs: [dirtyTab()] });

    const promise = confirmWindowClose.call(vm);
    vm.dontConfirmWindowCloseAgain = true;
    resolveConfirmWindowClose.call(vm, true);
    await promise;

    // Main owns the setting and saves it before closing - the renderer only
    // reports the choice.
    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(true, true);
  });
});

describe("CoreTabs resolveConfirmWindowClose", () => {
  it("settles the pending promise once and hides the modal", () => {
    const resolve = vi.fn();
    const vm = context({ confirmWindowCloseResolve: resolve });

    resolveConfirmWindowClose.call(vm, true);

    expect(resolve).toHaveBeenCalledWith(true);
    expect(vm.$modal.hide).toHaveBeenCalledWith(vm.confirmWindowCloseModalId);
    expect(vm.confirmWindowCloseResolve).toBeNull();
  });

  // BaseModal's `closed` fires after an explicit confirm/cancel too (see the
  // comment on the method), so a second call - e.g. `closed` following a
  // button click that already resolved - must be a no-op, not a second
  // resolve() or a stray respondConfirmWindowClose.
  it("is a no-op on a second call", () => {
    const resolve = vi.fn();
    const vm = context({ confirmWindowCloseResolve: resolve });

    resolveConfirmWindowClose.call(vm, true);
    resolveConfirmWindowClose.call(vm, false);

    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
