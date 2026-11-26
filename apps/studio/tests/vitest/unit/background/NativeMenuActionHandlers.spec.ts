import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  app: {
    relaunch: vi.fn(),
    quit: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  app: mocks.app,
  dialog: {},
  shell: {},
}));
vi.mock("electron-updater", () => ({ autoUpdater: { checkForUpdates: vi.fn() } }));
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
  let savedAppImage: string | undefined;

  beforeEach(() => {
    savedAppImage = process.env.APPIMAGE;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (savedAppImage === undefined) delete process.env.APPIMAGE;
    else process.env.APPIMAGE = savedAppImage;
  });

  it("relaunches the AppImage file, not the binary in its temporary mount", () => {
    process.env.APPIMAGE = "/tmp/Beekeeper-Studio.AppImage";

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith({
      execPath: "/tmp/Beekeeper-Studio.AppImage",
      args: process.argv.slice(1),
    });
    expect(mocks.app.quit).toHaveBeenCalled();
  });

  it("relaunches with no arguments when APPIMAGE is unset", () => {
    delete process.env.APPIMAGE;

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.app.quit).toHaveBeenCalled();
  });
});
