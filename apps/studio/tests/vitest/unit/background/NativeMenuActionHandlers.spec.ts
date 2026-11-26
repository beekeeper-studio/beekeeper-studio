import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  app: {
    relaunch: vi.fn(),
    quit: vi.fn(),
  },
  relaunchOnQuit: vi.fn(),
}));

vi.mock("electron", () => ({
  app: mocks.app,
  dialog: {},
  shell: {},
}));
vi.mock("electron-updater", () => ({ autoUpdater: { checkForUpdates: vi.fn() } }));
vi.mock("@/background/relaunch", () => ({ relaunchOnQuit: mocks.relaunchOnQuit }));
vi.mock("@/background/WindowBuilder", () => ({
  buildWindow: vi.fn(),
  getActiveWindows: () => [],
  setConfirmWindowClose: vi.fn(),
}));
vi.mock("@/background/update_manager", () => ({ setAllowBeta: vi.fn() }));
vi.mock("@/lib/license", () => ({}));
vi.mock("@/common/bksConfig/mainBksConfig", () => ({
  ensureConfigFile: vi.fn(),
  userConfigPath: vi.fn(),
}));
vi.mock("@/common/platform_info", () => ({
  default: {
    get isAppImage() {
      return Boolean(process.env.APPIMAGE);
    },
  },
}));
vi.mock("@bksLogger", () => {
  const logger = { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} };
  return { default: { scope: () => logger } };
});

import NativeMenuActionHandlers from "@/background/NativeMenuActionHandlers";

describe("NativeMenuActionHandlers.restart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("arms a relaunch on quit and quits the app", () => {
    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.relaunchOnQuit).toHaveBeenCalledTimes(1);
    expect(mocks.app.quit).toHaveBeenCalledTimes(1);
    expect(mocks.app.relaunch).not.toHaveBeenCalled();
  });
});
