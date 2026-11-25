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

function withDestroyHooks(ctx) {
  ctx.rootBindings = [];
  ctx.unregisterHandlers = vi.fn();
  ctx.split = null;
  ctx.connection = { releaseConnection: vi.fn() };
  ctx.containerResizeObserver = { disconnect: vi.fn() };
  ctx.removeTransactionTimeoutListener = vi.fn();
  return ctx;
}

describe("saved query polling", () => {
  it("does not start polling when the tab is destroyed during load", async () => {
    const ctx = {
      editorClosed: false,
      tab: { queryId: 7, isLoading: false },
      $set(obj, key, value) {
        obj[key] = value;
      },
      $store: {
        dispatch: vi.fn(async () => {
          TabQueryEditor.beforeDestroy.call(withDestroyHooks(ctx));
          return { id: 7, text: "select 1", title: "q" };
        }),
      },
      maybePollOriginalText: vi.fn(),
      getQueryActions: queryActions,
      initializeQueries: vi.fn(),
    };

    await TabQueryEditor.mounted.call(ctx);

    expect(ctx.editorClosed).toBe(true);
    expect(ctx.maybePollOriginalText).not.toHaveBeenCalled();
    expect(ctx.initializeQueries).not.toHaveBeenCalled();
    expect(ctx.tab.isLoading).toBe(false);
  });

  it("does not start polling from a closed editor", () => {
    const ctx = {
      editorClosed: true,
      active: true,
      isCloud: true,
      tab: { queryId: 1 },
      pollInterval: null,
      $bksConfig: { general: { workspaceSyncInterval: 10000 } },
    };

    TabQueryEditor.methods.maybePollOriginalText.call(ctx);

    expect(ctx.pollInterval).toBeNull();
  });

  it("marks the editor closed and clears an existing poll", () => {
    vi.useFakeTimers();
    const ctx = withDestroyHooks({
      editorClosed: false,
      tab: { id: 1 },
      pollInterval: setInterval(() => {}, 10000),
    });

    TabQueryEditor.beforeDestroy.call(ctx);

    expect(ctx.editorClosed).toBe(true);
    expect(ctx.pollInterval).toBeNull();
    vi.useRealTimers();
  });

  it("starts polling for an open cloud query", () => {
    vi.useFakeTimers();
    const ctx = {
      editorClosed: false,
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
