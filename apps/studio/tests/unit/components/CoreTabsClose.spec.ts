import CoreTabs from "@/components/CoreTabs.vue";

// `close` gates every tab close on `closingTab`, so if it's ever left set the
// ✕ button, ctrl+w and File > Close Tab all become silent no-ops. Exercise the
// method directly - mounting CoreTabs would drag in the whole tab surface.
const close = (CoreTabs as any).options.methods.close;

function context(overrides: Record<string, any> = {}) {
  return {
    closingTab: null,
    confirmModalId: "core-tabs-close-confirmation",
    activeTab: null,
    selectedSidebarItem: null,
    trigger: jest.fn(),
    $store: { dispatch: jest.fn().mockResolvedValue(undefined), commit: jest.fn() },
    $confirmById: jest.fn().mockResolvedValue(true),
    lastTab: null,
    previousTab: jest.fn(),
    nextTab: jest.fn(),
    ...overrides,
  };
}

const dirtyTab = () => ({ unsavedChanges: true, title: "Query #1" });
const cleanTab = () => ({ unsavedChanges: false, title: "Query #2" });

describe("CoreTabs close", () => {
  it("removes a tab with no unsaved changes", async () => {
    const vm = context();
    const tab = cleanTab();

    await close.call(vm, tab);

    expect(vm.$store.dispatch).toHaveBeenCalledWith("tabs/remove", tab);
  });

  it("removes a tab with unsaved changes once confirmed", async () => {
    const vm = context();
    const tab = dirtyTab();

    await close.call(vm, tab);

    expect(vm.$confirmById).toHaveBeenCalledWith(vm.confirmModalId);
    expect(vm.$store.dispatch).toHaveBeenCalledWith("tabs/remove", tab);
    expect(vm.closingTab).toBeNull();
  });

  it("keeps the tab and clears closingTab when the confirmation is declined", async () => {
    const vm = context({ $confirmById: jest.fn().mockResolvedValue(false) });

    await close.call(vm, dirtyTab());

    expect(vm.$store.dispatch).not.toHaveBeenCalled();
    expect(vm.closingTab).toBeNull();
  });

  // A confirmation that blows up used to leave `closingTab` pinned, which
  // disabled tab closing entirely until the app was restarted.
  it("clears closingTab when the confirmation rejects", async () => {
    const vm = context({
      $confirmById: jest.fn().mockRejectedValue(new Error("modal is gone")),
    });

    await expect(close.call(vm, dirtyTab())).rejects.toThrow("modal is gone");
    expect(vm.closingTab).toBeNull();

    // ...and the next close still works.
    const tab = cleanTab();
    await close.call(vm, tab);
    expect(vm.$store.dispatch).toHaveBeenCalledWith("tabs/remove", tab);
  });
});
