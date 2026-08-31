import { AppEvent } from "@/common/AppEvent";

const mockState = { idleSeconds: 0 };
const mockSend = jest.fn();
const mockIpcHandlers: Record<string, (...args: any[]) => void> = {};

jest.mock("electron", () => ({
  powerMonitor: {
    getSystemIdleTime: () => mockState.idleSeconds,
    on: jest.fn(),
  },
  ipcMain: {
    on: (channel: string, handler: (...args: any[]) => void) => {
      mockIpcHandlers[channel] = handler;
    },
  },
}));

jest.mock("@/background/WindowBuilder", () => ({
  getActiveWindows: () => [{ send: mockSend }],
}));

jest.mock("@/common/bksConfig", () => ({
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
    jest.useFakeTimers();
    jest.resetModules();
    mockSend.mockClear();
    mockState.idleSeconds = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("only fires disconnect once while the user remains idle", () => {
    const { initializeSecurity } = require("@/backend/lib/security");
    initializeSecurity();

    mockState.idleSeconds = 20;
    jest.advanceTimersByTime(15000);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(AppEvent.disconnect, {
      reason: "User has been idle",
    });
  });

  it("re-arms after the user returns and then goes idle again", () => {
    const { initializeSecurity } = require("@/backend/lib/security");
    initializeSecurity();

    mockState.idleSeconds = 20;
    jest.advanceTimersByTime(15000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 0;
    jest.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 20;
    jest.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("does not disconnect while the user is active in the app, even when the system reports idle", () => {
    const { initializeSecurity } = require("@/backend/lib/security");
    initializeSecurity();

    // The OS reports the user as idle the whole time - the unreliable Linux
    // behaviour from issue #4144.
    mockState.idleSeconds = 20;

    // But the renderer keeps reporting real input, so we must not disconnect.
    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(3000);
      mockIpcHandlers["userActive"]();
    }

    expect(mockSend).not.toHaveBeenCalled();
  });
});
