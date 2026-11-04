import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppEvent } from "@/common/AppEvent";

const mockState = { idleSeconds: 0 };
const mockSend = vi.fn();
const mockIpcHandlers: Record<string, (...args: any[]) => void> = {};

vi.mock("electron", () => ({
  powerMonitor: {
    getSystemIdleTime: () => mockState.idleSeconds,
    on: vi.fn(),
  },
  ipcMain: {
    on: (channel: string, handler: (...args: any[]) => void) => {
      mockIpcHandlers[channel] = handler;
    },
  },
}));

vi.mock("@/background/WindowBuilder", () => ({
  getActiveWindows: () => [{ send: mockSend }],
}));

vi.mock("@/common/bksConfig", () => ({
  __esModule: true,
  default: {
    security: {
      disconnectOnIdle: true,
      idleThresholdSeconds: 10,
      idleCheckIntervalSeconds: 1,
      disconnectOnSuspend: false,
      disconnectOnLock: false,
    },
  },
}));

describe("security idle disconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockSend.mockClear();
    mockState.idleSeconds = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only fires disconnect once while the user remains idle", async () => {
    const { initializeSecurity } = await import("@/backend/lib/security");
    initializeSecurity();

    mockState.idleSeconds = 20;
    vi.advanceTimersByTime(15000);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(AppEvent.disconnect, {
      reason: "User has been idle",
    });
  });

  it("re-arms after the user returns and then goes idle again", async () => {
    const { initializeSecurity } = await import("@/backend/lib/security");
    initializeSecurity();

    mockState.idleSeconds = 20;
    vi.advanceTimersByTime(15000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 0;
    vi.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 20;
    vi.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("does not disconnect while the user is active in the app, even when the system reports idle", async () => {
    const { initializeSecurity } = await import("@/backend/lib/security");
    initializeSecurity();

    // The OS reports the user as idle the whole time - the unreliable Linux
    // behaviour from issue #4144.
    mockState.idleSeconds = 20;

    // But the renderer keeps reporting real input, so we must not disconnect.
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(3000);
      mockIpcHandlers["userActive"]();
    }

    expect(mockSend).not.toHaveBeenCalled();
  });
});
