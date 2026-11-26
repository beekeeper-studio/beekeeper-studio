import { describe, expect, it, vi } from "vitest";
import TabQueryEditor from "@/components/TabQueryEditor.vue";

describe("query editor timer", () => {
  it("stops the elapsed timer when the tab is destroyed", () => {
    vi.useFakeTimers();
    const ctx = {
      rootBindings: [],
      unregisterHandlers: vi.fn(),
      split: null,
      connection: { releaseConnection: vi.fn() },
      tab: { id: "tab-1" },
      containerResizeObserver: { disconnect: vi.fn() },
      removeTransactionTimeoutListener: vi.fn(),
      pollInterval: null,
      elapsedTime: 3,
      timerInterval: null,
    };
    ctx.startTimer = TabQueryEditor.methods.startTimer.bind(ctx);
    ctx.stopTimer = TabQueryEditor.methods.stopTimer.bind(ctx);

    ctx.startTimer();
    expect(ctx.timerInterval).not.toBeNull();

    TabQueryEditor.beforeDestroy.call(ctx);
    vi.advanceTimersByTime(5000);

    expect(ctx.elapsedTime).toBe(0);
    expect(ctx.timerInterval).toBeNull();
    vi.useRealTimers();
  });
});
