import { describe, expect, it, vi } from "vitest";
import TabQueryEditor from "@/components/TabQueryEditor.vue";

function queryActions() {
  return {
    primaryFunc() {},
    secondaryFunc() {},
    primaryWriteFunction() {},
    secondaryWriteFunc() {},
  };
}

describe("saved query polling", () => {
  it("does not start polling when the tab is destroyed during load", async () => {
    const ctx = {
      _isDestroyed: false,
      _isBeingDestroyed: false,
      tab: { queryId: 7, isLoading: false },
      $set(obj, key, value) {
        obj[key] = value;
      },
      $store: {
        dispatch: vi.fn(async () => {
          ctx._isDestroyed = true;
          return { id: 7, text: "select 1", title: "q" };
        }),
      },
      maybePollOriginalText: vi.fn(),
      getQueryActions: queryActions,
      initializeQueries: vi.fn(),
    };

    await TabQueryEditor.mounted.call(ctx);

    expect(ctx.maybePollOriginalText).not.toHaveBeenCalled();
    expect(ctx.initializeQueries).not.toHaveBeenCalled();
    expect(ctx.tab.isLoading).toBe(false);
  });

  it("does not start polling from a destroyed editor", () => {
    const ctx = {
      _isDestroyed: true,
      _isBeingDestroyed: false,
      active: true,
      isCloud: true,
      tab: { queryId: 1 },
      pollInterval: null,
      $bksConfig: { general: { workspaceSyncInterval: 10000 } },
    };

    TabQueryEditor.methods.maybePollOriginalText.call(ctx);

    expect(ctx.pollInterval).toBeNull();
  });

  it("starts polling for an open cloud query", () => {
    vi.useFakeTimers();
    const ctx = {
      _isDestroyed: false,
      _isBeingDestroyed: false,
      active: true,
      isCloud: true,
      tab: { queryId: 1 },
      pollInterval: null,
      $bksConfig: { general: { workspaceSyncInterval: 10000 } },
      $store: { dispatch: vi.fn() },
    };

    TabQueryEditor.methods.maybePollOriginalText.call(ctx);

    expect(ctx.pollInterval).not.toBeNull();
    clearInterval(ctx.pollInterval);
    vi.useRealTimers();
  });
});
