import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EventEmitter } from "events";

interface AppMock extends EventEmitter {
  relaunch: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  exit: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  app: null as unknown as AppMock,
  spawn: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("electron", async () => {
  const { EventEmitter } = await import("events");
  const app = Object.assign(new EventEmitter(), {
    relaunch: vi.fn(),
    quit: vi.fn(),
    exit: vi.fn(),
  });
  mocks.app = app as AppMock;
  return { app, default: { app } };
});
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    default: { ...actual, spawn: mocks.spawn },
    spawn: mocks.spawn,
  };
});
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: { ...actual, statSync: mocks.statSync, mkdirSync: mocks.mkdirSync },
    statSync: mocks.statSync,
    mkdirSync: mocks.mkdirSync,
  };
});

import {
  buildRelaunchEnv,
  resolveAppImagePath,
  spawnAppImage,
  relaunchNow,
  relaunchOnQuit,
  cancelPendingRelaunch,
} from "@/background/relaunch";

function mockFiles(files: Record<string, "file" | "dir">) {
  mocks.statSync.mockImplementation((p: any) => {
    const kind = files[String(p)];
    if (!kind) throw new Error(`ENOENT: ${String(p)}`);
    return { isFile: () => kind === "file", isDirectory: () => kind === "dir" };
  });
}

const APPIMAGE = "/imgs/Beekeeper-Studio.AppImage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildRelaunchEnv", () => {
  it("drops runtime and launcher vars, keeps user vars, never mutates the input", () => {
    const env = {
      APPDIR: "/tmp/.mount_abc",
      APPIMAGE,
      ARGV0: "./Beekeeper-Studio.AppImage",
      OWD: "/home/u",
      TARGET_APPIMAGE: APPIMAGE,
      REDIRECT_APPIMAGE: APPIMAGE,
      DESKTOPINTEGRATION: "AppImageLauncher",
      APPIMAGE_EXTRACT_AND_RUN: "1",
      HOME: "/home/u",
      FOO: "bar",
    };

    const clean = buildRelaunchEnv(env);

    expect(clean).toEqual({
      DESKTOPINTEGRATION: "AppImageLauncher",
      APPIMAGE_EXTRACT_AND_RUN: "1",
      HOME: "/home/u",
      FOO: "bar",
    });
    expect(env.APPDIR).toBe("/tmp/.mount_abc");
    expect(env.APPIMAGE).toBe(APPIMAGE);
  });

  it("removes only path-list entries equal to or under the mount dir", () => {
    const env = {
      APPDIR: "/tmp/.mount_abc",
      LD_LIBRARY_PATH: "/tmp/.mount_abc/usr/lib:/tmp/.mount_abcdef/lib:/opt/oracle",
      PATH: "/tmp/.mount_abc/usr/bin:/usr/bin:/bin",
      XDG_DATA_DIRS: "/tmp/.mount_abc/usr/share:/usr/share",
      GSETTINGS_SCHEMA_DIR: "/tmp/.mount_abc/usr/share/glib-2.0/schemas",
    };

    const clean = buildRelaunchEnv(env);

    expect(clean.LD_LIBRARY_PATH).toBe("/tmp/.mount_abcdef/lib:/opt/oracle");
    expect(clean.PATH).toBe("/usr/bin:/bin");
    expect(clean.XDG_DATA_DIRS).toBe("/usr/share");
    // left empty: deleted
    expect(clean.GSETTINGS_SCHEMA_DIR).toBeUndefined();
    expect("GSETTINGS_SCHEMA_DIR" in clean).toBe(false);
  });

  it("removes only the AppImageLauncher entry from LD_PRELOAD", () => {
    const mixed = {
      APPDIR: "/tmp/.mount_abc",
      LD_PRELOAD: `/tmp/appimagelauncher-preload-a1b2c3.so:/opt/other/lib.so`,
    };
    expect(buildRelaunchEnv(mixed).LD_PRELOAD).toBe("/opt/other/lib.so");

    const installed = {
      APPDIR: "/tmp/.mount_abc",
      LD_PRELOAD: "/usr/lib/libbinfmt-bypass-preload.so",
    };
    expect(buildRelaunchEnv(installed).LD_PRELOAD).toBeUndefined();

    const unrelated = {
      APPDIR: "/tmp/.mount_abc",
      LD_PRELOAD: "/opt/libsomething-else.so",
    };
    expect(buildRelaunchEnv(unrelated).LD_PRELOAD).toBe("/opt/libsomething-else.so");
  });
});

describe("resolveAppImagePath", () => {
  it("prefers APPIMAGE when it is absolute and an existing file", () => {
    mockFiles({ [APPIMAGE]: "file", "/other/app.AppImage": "file" });
    expect(
      resolveAppImagePath({ APPIMAGE, ARGV0: "/other/app.AppImage" })
    ).toBe(APPIMAGE);
  });

  it("falls back to ARGV0 when APPIMAGE is relative or not a file", () => {
    mockFiles({ "/real/app.AppImage": "file" });
    expect(
      resolveAppImagePath({ APPIMAGE: "undefined", ARGV0: "/real/app.AppImage" })
    ).toBe("/real/app.AppImage");
    expect(
      resolveAppImagePath({ APPIMAGE: "relative/app.AppImage", ARGV0: "/real/app.AppImage" })
    ).toBe("/real/app.AppImage");
  });

  it("returns null when neither candidate is usable", () => {
    mockFiles({});
    expect(resolveAppImagePath({ APPIMAGE: "/missing.AppImage", ARGV0: "undef" })).toBeNull();
    expect(resolveAppImagePath({})).toBeNull();
  });
});

describe("spawnAppImage", () => {
  beforeEach(() => {
    mocks.spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });
    mockFiles({ [APPIMAGE]: "file", "/work": "dir" });
  });

  it("spawns the AppImage detached with a cleaned env on a plain FUSE mount", () => {
    const env = {
      APPDIR: "/tmp/.mount_abc",
      APPIMAGE,
      ARGV0: APPIMAGE,
      OWD: "/work",
      TARGET_APPIMAGE: APPIMAGE,
      REDIRECT_APPIMAGE: APPIMAGE,
      LD_LIBRARY_PATH: "/tmp/.mount_abc/usr/lib:/usr/lib",
      HOME: "/home/u",
    };

    spawnAppImage(APPIMAGE, ["--foo"], env);

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = mocks.spawn.mock.calls[0];
    expect(cmd).toBe(APPIMAGE);
    expect(args).toEqual(["--foo"]);
    expect(opts.detached).toBe(true);
    expect(opts.stdio).toBe("ignore");
    expect(opts.cwd).toBe("/work");
    expect(opts.env.APPDIR).toBeUndefined();
    expect(opts.env.APPIMAGE).toBeUndefined();
    expect(opts.env.ARGV0).toBeUndefined();
    expect(opts.env.OWD).toBeUndefined();
    expect(opts.env.TARGET_APPIMAGE).toBeUndefined();
    expect(opts.env.REDIRECT_APPIMAGE).toBeUndefined();
    expect(opts.env.LD_LIBRARY_PATH).toBe("/usr/lib");
    expect(opts.env.HOME).toBe("/home/u");
    // input env untouched
    expect(env.LD_LIBRARY_PATH).toBe("/tmp/.mount_abc/usr/lib:/usr/lib");
    expect(env.APPDIR).toBe("/tmp/.mount_abc");
  });

  it("keeps APPIMAGE_EXTRACT_AND_RUN and DESKTOPINTEGRATION", () => {
    const env = {
      APPDIR: "/tmp/.mount_abc",
      APPIMAGE,
      APPIMAGE_EXTRACT_AND_RUN: "1",
      DESKTOPINTEGRATION: "AppImageLauncher",
    };

    spawnAppImage(APPIMAGE, [], env);

    const opts = mocks.spawn.mock.calls[0][2];
    expect(opts.env.APPIMAGE_EXTRACT_AND_RUN).toBe("1");
    expect(opts.env.DESKTOPINTEGRATION).toBe("AppImageLauncher");
  });

  it("adds --appimage-extract-and-run and a private TMPDIR when the old APPDIR is not a FUSE mount", () => {
    const env = {
      APPDIR: "/tmp/appimage_extracted_deadbeef",
      APPIMAGE,
      OWD: "/work",
      TMPDIR: "/tmp",
    };

    spawnAppImage(APPIMAGE, ["--foo"], env);

    const [, args, opts] = mocks.spawn.mock.calls[0];
    expect(args).toEqual(["--foo", "--appimage-extract-and-run"]);
    expect(opts.env.TMPDIR).toMatch(/\/\.bks-relaunch-\d+$/);
    expect(opts.env.TMPDIR?.startsWith("/tmp/")).toBe(true);
    expect(opts.env.APPDIR).toBeUndefined();
    expect(mocks.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(".bks-relaunch-"),
      { recursive: true }
    );
  });

  it("adds the extract-and-run flag when APPDIR is missing", () => {
    const env = { APPIMAGE };

    spawnAppImage(APPIMAGE, [], env);

    const [, args] = mocks.spawn.mock.calls[0];
    expect(args).toEqual(["--appimage-extract-and-run"]);
  });

  it("does not duplicate a flag already in args", () => {
    const env = { APPDIR: "/tmp/appimage_extracted_x", APPIMAGE };

    spawnAppImage(APPIMAGE, ["--appimage-extract-and-run"], env);

    const [, args] = mocks.spawn.mock.calls[0];
    expect(args.filter((a) => a === "--appimage-extract-and-run")).toHaveLength(1);
  });

  it("falls back to the home dir when OWD is gone", () => {
    const env = { APPDIR: "/tmp/.mount_abc", APPIMAGE, OWD: "/deleted/dir" };

    spawnAppImage(APPIMAGE, [], env);

    const opts = mocks.spawn.mock.calls[0][2];
    expect(opts.cwd).not.toBe("/deleted/dir");
  });
});

describe("relaunchNow and relaunchOnQuit", () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    mocks.spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });
    mockFiles({ [APPIMAGE]: "file", "/work": "dir" });
  });

  afterEach(() => {
    cancelPendingRelaunch();
    mocks.app.removeAllListeners("will-quit");
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  });

  it("relaunchNow falls back to app.relaunch when not an AppImage", () => {
    delete process.env.APPIMAGE;
    delete process.env.ARGV0;

    relaunchNow();

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("relaunchNow spawns the AppImage when a path resolves", () => {
    process.env.APPIMAGE = APPIMAGE;
    process.env.APPDIR = "/tmp/.mount_abc";

    relaunchNow();

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    expect(mocks.spawn.mock.calls[0][0]).toBe(APPIMAGE);
    expect(mocks.app.relaunch).not.toHaveBeenCalled();
  });

  it("relaunchNow falls back to app.relaunch when no path resolves", () => {
    process.env.APPIMAGE = "undefined";
    process.env.ARGV0 = "also-bad";

    relaunchNow();

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("relaunchOnQuit uses app.relaunch off AppImage", () => {
    delete process.env.APPIMAGE;
    delete process.env.ARGV0;

    relaunchOnQuit();
    mocks.app.emit("will-quit");

    expect(mocks.app.relaunch).toHaveBeenCalledWith();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("a cancelled quit does not spawn, and a later restart still works", () => {
    process.env.APPIMAGE = APPIMAGE;
    process.env.APPDIR = "/tmp/.mount_abc";

    relaunchOnQuit();
    cancelPendingRelaunch();
    mocks.app.emit("will-quit");

    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.app.relaunch).not.toHaveBeenCalled();

    relaunchOnQuit();
    mocks.app.emit("will-quit");

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    expect(mocks.app.relaunch).not.toHaveBeenCalled();
  });

  it("will-quit without a pending restart does nothing", () => {
    process.env.APPIMAGE = APPIMAGE;

    mocks.app.emit("will-quit");

    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.app.relaunch).not.toHaveBeenCalled();
  });

  it("double relaunchOnQuit still spawns only once", () => {
    process.env.APPIMAGE = APPIMAGE;
    process.env.APPDIR = "/tmp/.mount_abc";

    relaunchOnQuit();
    relaunchOnQuit();
    mocks.app.emit("will-quit");

    expect(mocks.spawn).toHaveBeenCalledTimes(1);
  });
});
