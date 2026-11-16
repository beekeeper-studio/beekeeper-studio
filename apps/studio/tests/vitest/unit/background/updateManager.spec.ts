import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const updaterHandlers: Record<string, (...args: any[]) => void> = {};
  return {
    platformInfo: {} as Record<string, any>,
    config: { general: { checkForUpdatesDisabled: false, checkForUpdatesInterval: 86400000 } },
    ipcHandlers: {} as Record<string, (...args: any[]) => void>,
    updaterHandlers,
    sent: [] as any[][],
    autoUpdater: {
      on: (event: string, fn: (...args: any[]) => void) => { updaterHandlers[event] = fn },
      checkForUpdates: vi.fn(),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    } as Record<string, any>,
  };
});

vi.mock("electron", () => ({
  ipcMain: { on: (channel: string, fn: (...args: any[]) => void) => { mocks.ipcHandlers[channel] = fn } },
}));
vi.mock("electron-updater", () => ({ autoUpdater: mocks.autoUpdater }));
vi.mock("@/background/WindowBuilder", () => ({
  getActiveWindows: () => [{ send: (...args: any[]) => mocks.sent.push(args) }],
}));
vi.mock("@/common/platform_info", () => ({ default: mocks.platformInfo }));
vi.mock("@/common/bksConfig", () => ({ default: mocks.config }));
vi.mock("@bksLogger", () => {
  const logger = { info: () => {}, error: () => {}, debug: () => {} };
  return { default: { scope: () => logger } };
});

import { manageUpdates } from "@/background/update_manager";

function windowsInstall(overrides: Record<string, any> = {}) {
  for (const key of Object.keys(mocks.platformInfo)) delete mocks.platformInfo[key];
  Object.assign(mocks.platformInfo, {
    environment: "production",
    isWindows: true,
    isLinux: false,
    isMac: false,
    isPortable: undefined,
    isMsi: false,
    ...overrides,
  });
}

describe("manageUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const key of Object.keys(mocks.ipcHandlers)) delete mocks.ipcHandlers[key];
    for (const key of Object.keys(mocks.updaterHandlers)) delete mocks.updaterHandlers[key];
    mocks.sent.length = 0;
    mocks.config.general.checkForUpdatesDisabled = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers to download updates on regular installs", () => {
    windowsInstall();
    manageUpdates(true);

    mocks.updaterHandlers["update-available"]({ version: "6.2.0" });

    expect(mocks.sent).toEqual([["update-available", "6.2.0"]]);
    expect(mocks.ipcHandlers["download-update"]).toBeTypeOf("function");
    expect(mocks.ipcHandlers["install-update"]).toBeTypeOf("function");
    expect(mocks.autoUpdater.allowPrerelease).toBe(true);
  });

  it("points portable users to the website", () => {
    windowsInstall({ isPortable: "C:\\Tools" });
    manageUpdates(false);

    mocks.updaterHandlers["update-available"]({ version: "6.2.0" });

    expect(mocks.sent).toEqual([["manual-update", "6.2.0"]]);
  });

  describe("MSI installs", () => {
    beforeEach(() => windowsInstall({ isMsi: true }));

    it("tells users to contact their administrator", () => {
      manageUpdates(false);

      mocks.updaterHandlers["update-available"]({ version: "6.2.0" });

      expect(mocks.sent).toEqual([["managed-update", "6.2.0"]]);
    });

    it("never downloads or installs anything", () => {
      manageUpdates(false);

      expect(mocks.ipcHandlers["download-update"]).toBeUndefined();
      expect(mocks.ipcHandlers["install-update"]).toBeUndefined();
      expect(mocks.updaterHandlers["update-downloaded"]).toBeUndefined();
    });

    it("only reports stable releases, even with the beta channel selected", () => {
      manageUpdates(true);

      expect(mocks.autoUpdater.allowPrerelease).toBe(false);
      expect(mocks.autoUpdater.channel).toBe("latest");
    });

    it("stays quiet when update checks are disabled in config", () => {
      mocks.config.general.checkForUpdatesDisabled = true;
      manageUpdates(false);

      expect(mocks.ipcHandlers["updater-ready"]).toBeUndefined();
      expect(mocks.updaterHandlers["update-available"]).toBeUndefined();
    });
  });
});
