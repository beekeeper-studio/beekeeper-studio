import { AppEvent } from "@/common/AppEvent";

const mockState = { idleSeconds: 0 };
const mockSend = jest.fn();

jest.mock("electron", () => ({
  powerMonitor: {
    getSystemIdleTime: () => mockState.idleSeconds,
    on: jest.fn(),
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
    jest.advanceTimersByTime(5000);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(AppEvent.disconnect, {
      reason: "User has been idle",
    });
  });

  it("re-arms after the user returns and then goes idle again", () => {
    const { initializeSecurity } = require("@/backend/lib/security");
    initializeSecurity();

    mockState.idleSeconds = 20;
    jest.advanceTimersByTime(5000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 0;
    jest.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(1);

    mockState.idleSeconds = 20;
    jest.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
