import { describe, it, expect, vi, beforeEach } from "vitest";
import { pluralize } from "@/vendor/pluralize";
import CoreTabs from "@/components/CoreTabs.vue";

// Bound to a plain context object rather than mounting CoreTabs - mounting
// would drag in the whole tab surface for logic that only touches
// `this.tabs` and `this.$confirm`.
const confirmWindowClose = (CoreTabs as any).options.methods.confirmWindowClose;

function context(overrides: Record<string, any> = {}) {
  return {
    tabs: [],
    $confirm: vi.fn().mockResolvedValue(true),
    $pluralize: pluralize,
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

  it("acks before doing anything else, then answers true when there are no unsaved tabs", async () => {
    const vm = context({ tabs: [cleanTab(), cleanTab()] });

    await confirmWindowClose.call(vm);

    expect(window.main.ackConfirmWindowClose).toHaveBeenCalled();
    expect(vm.$confirm).not.toHaveBeenCalled();
    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(true);
  });

  it("acks, then asks for confirmation when there are unsaved tabs, and answers what the user chose", async () => {
    const vm = context({ tabs: [dirtyTab(), cleanTab()], $confirm: vi.fn().mockResolvedValue(true) });

    await confirmWindowClose.call(vm);

    expect(window.main.ackConfirmWindowClose).toHaveBeenCalled();
    expect(vm.$confirm).toHaveBeenCalledWith(
      "Close this window?",
      "You have 1 unsaved tab. Are you sure?"
    );
    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(true);
  });

  it("answers false when the user declines", async () => {
    const vm = context({ tabs: [dirtyTab()], $confirm: vi.fn().mockResolvedValue(false) });

    await confirmWindowClose.call(vm);

    expect(window.main.respondConfirmWindowClose).toHaveBeenCalledWith(false);
  });
});
