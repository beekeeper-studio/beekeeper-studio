import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

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
vi.mock("@/common/platform_info", () => ({ default: {} }));
vi.mock("@bksLogger", () => {
  const logger = { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} };
  return { default: { scope: () => logger } };
});

import NativeMenuActionHandlers from "@/background/NativeMenuActionHandlers";

describe("NativeMenuActionHandlers.restart", () => {
  let saved: { APPIMAGE?: string; APPDIR?: string };
  let tmp: string;
  let appImageFile: string;

  function inAppImage(appImage = appImageFile) {
    process.env.APPIMAGE = appImage;
    process.env.APPDIR = path.dirname(fs.realpathSync(process.execPath));
  }

  beforeEach(() => {
    saved = { APPIMAGE: process.env.APPIMAGE, APPDIR: process.env.APPDIR };
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bks-restart-"));
    appImageFile = path.join(tmp, "Beekeeper-Studio.AppImage");
    fs.writeFileSync(appImageFile, "");
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const key of ["APPIMAGE", "APPDIR"] as const) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("relaunches the AppImage file, not the binary in its temporary mount", () => {
    inAppImage();

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith({
      execPath: appImageFile,
      args: process.argv.slice(1),
    });
    expect(mocks.app.quit).toHaveBeenCalled();
    expect(mocks.app.relaunch.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.app.quit.mock.invocationCallOrder[0],
    );
  });

  it("relaunches with no arguments outside an AppImage", () => {
    delete process.env.APPIMAGE;
    delete process.env.APPDIR;

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.app.quit).toHaveBeenCalled();
  });

  it.each([
    ["APPIMAGE is the text undefined left by the AppImageLauncher rewrite", () => inAppImage("undefined")],
    ["APPIMAGE is empty", () => inAppImage("")],
    ["APPIMAGE names a missing file", () => inAppImage(path.join(tmp, "gone.AppImage"))],
    ["APPIMAGE leaked from another AppImage", () => {
      inAppImage();
      const other = path.join(tmp, ".mount_Other");
      fs.mkdirSync(other);
      process.env.APPDIR = other;
    }],
    ["APPDIR is unset", () => {
      inAppImage();
      delete process.env.APPDIR;
    }],
    ["APPIMAGE is a directory", () => inAppImage(tmp)],
    ["APPIMAGE is a relative path to an existing file", () => inAppImage(path.relative(process.cwd(), appImageFile))],
    ["APPDIR is the filesystem root", () => {
      inAppImage();
      process.env.APPDIR = path.parse(process.execPath).root;
    }],
    ["APPDIR does not exist", () => {
      inAppImage();
      process.env.APPDIR = path.join(tmp, ".mount_gone");
    }],
    ["APPDIR is a relative path", () => {
      inAppImage();
      process.env.APPDIR = path.relative(process.cwd(), path.dirname(fs.realpathSync(process.execPath))) || ".";
    }],
    ["APPIMAGE is a symlink loop", () => {
      const loop = path.join(tmp, "loop.AppImage");
      fs.symlinkSync(loop, loop);
      inAppImage(loop);
    }],
    ["APPIMAGE is a symlink loop outside an AppImage", () => {
      const loop = path.join(tmp, "loop.AppImage");
      fs.symlinkSync(loop, loop);
      const other = path.join(tmp, ".mount_Other");
      fs.mkdirSync(other);
      process.env.APPIMAGE = loop;
      process.env.APPDIR = other;
    }],
  ])("relaunches with no arguments when %s", (_label, setup) => {
    setup();

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.app.quit).toHaveBeenCalled();
  });

  it.each([
    ["APPDIR has a trailing slash", () => path.dirname(fs.realpathSync(process.execPath)) + path.sep],
    ["APPDIR reaches the mount through a symlink", () => {
      const link = path.join(tmp, "mount-link");
      fs.symlinkSync(path.dirname(fs.realpathSync(process.execPath)), link);
      return link;
    }],
  ])("relaunches the AppImage file when %s", (_label, appDir) => {
    inAppImage();
    process.env.APPDIR = appDir();

    new NativeMenuActionHandlers({} as any).restart();

    expect(mocks.app.relaunch).toHaveBeenCalledWith({
      execPath: appImageFile,
      args: process.argv.slice(1),
    });
  });
});
