/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync } from "fs";
import os from "os";
import path from "path";
import type { loadConfig as LoadConfig } from "@/common/bksConfig/mainBksConfig";

// A packaged (non-dev) build, so loadConfig copies bundled configs into the
// user directory. userDirectory is swapped per test.
const mockPlatformInfo = vi.hoisted(() => ({
  isDevelopment: false,
  testMode: false,
  platform: "linux",
  userDirectory: "",
}));

vi.mock("@/common/platform_info", () => ({
  __esModule: true,
  default: mockPlatformInfo,
}));

const BUNDLED_DEFAULT = "[general]\nmaxResults = 10\n";
const BUNDLED_USER = "[general]\nmaxResults = 20\n";

// chmod doesn't stop root (or Windows) from writing, so permission cases
// can't be exercised there.
const canDropWritePermission = process.platform !== "win32" && process.getuid?.() !== 0;
const itWithPermissions = canDropWritePermission ? it : it.skip;

let loadConfig: typeof LoadConfig;
let bundleDir: string;
let userDir: string;
let originalResourcesPath: PropertyDescriptor | undefined;

beforeAll(async () => {
  bundleDir = mkdtempSync(path.join(os.tmpdir(), "bks-bundle-"));
  writeFileSync(path.join(bundleDir, "default.config.ini"), BUNDLED_DEFAULT);
  writeFileSync(path.join(bundleDir, "user.config.ini"), BUNDLED_USER);

  // mainBksConfig reads process.resourcesPath once, at module load.
  originalResourcesPath = Object.getOwnPropertyDescriptor(process, "resourcesPath");
  Object.defineProperty(process, "resourcesPath", { value: bundleDir, configurable: true, writable: true });

  ({ loadConfig } = await import("@/common/bksConfig/mainBksConfig"));
});

afterAll(() => {
  if (originalResourcesPath) {
    Object.defineProperty(process, "resourcesPath", originalResourcesPath);
  } else {
    delete (process as any).resourcesPath;
  }
  rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(() => {
  userDir = mkdtempSync(path.join(os.tmpdir(), "bks-user-"));
  mockPlatformInfo.userDirectory = userDir;
});

afterEach(() => {
  // Restore write access so the directory can be removed.
  if (canDropWritePermission) {
    chmodSync(userDir, 0o755);
  }
  rmSync(userDir, { recursive: true, force: true });
});

describe("copyBundledConfig (via loadConfig)", () => {
  it("copies default.config.ini into the user directory when it doesn't exist yet", () => {
    const dest = path.join(userDir, "default.config.ini");
    expect(existsSync(dest)).toBe(false);

    const config = loadConfig("default.config.ini");

    expect(readFileSync(dest, "utf-8")).toBe(BUNDLED_DEFAULT);
    expect(config).toMatchObject({ general: { maxResults: 10 } });
  });

  it("refreshes an existing default.config.ini with the bundled copy", () => {
    const dest = path.join(userDir, "default.config.ini");
    writeFileSync(dest, "[general]\nmaxResults = 999\n");

    loadConfig("default.config.ini");

    expect(readFileSync(dest, "utf-8")).toBe(BUNDLED_DEFAULT);
  });

  it("copies user.config.ini from the bundle when it is missing and reads it", () => {
    const config = loadConfig("user.config.ini");

    expect(readFileSync(path.join(userDir, "user.config.ini"), "utf-8")).toBe(BUNDLED_USER);
    expect(config).toMatchObject({ general: { maxResults: 20 } });
  });

  it("leaves an existing user.config.ini alone", () => {
    const dest = path.join(userDir, "user.config.ini");
    writeFileSync(dest, "[general]\nmaxResults = 30\n");

    const config = loadConfig("user.config.ini");

    expect(readFileSync(dest, "utf-8")).toBe("[general]\nmaxResults = 30\n");
    expect(config).toMatchObject({ general: { maxResults: 30 } });
  });

  itWithPermissions("skips the copy without throwing when the user directory isn't writable", () => {
    chmodSync(userDir, 0o555);

    const config = loadConfig("default.config.ini");

    expect(existsSync(path.join(userDir, "default.config.ini"))).toBe(false);
    // default.config.ini is always read from the bundle, so loading still works.
    expect(config).toMatchObject({ general: { maxResults: 10 } });
  });

  itWithPermissions("skips the copy without throwing when the existing file is read-only", () => {
    const dest = path.join(userDir, "default.config.ini");
    writeFileSync(dest, "[general]\nmaxResults = 999\n");
    chmodSync(dest, 0o444);

    expect(() => loadConfig("default.config.ini")).not.toThrow();
    expect(readFileSync(dest, "utf-8")).toBe("[general]\nmaxResults = 999\n");
  });

  itWithPermissions("fails to read user.config.ini when it is missing and can't be copied", () => {
    chmodSync(userDir, 0o555);

    expect(() => loadConfig("user.config.ini")).toThrow(/ENOENT/);
  });

  it("throws when the bundled file is missing", () => {
    // local.config.ini isn't in the fake bundle.
    expect(() => loadConfig("local.config.ini")).toThrow(/Bundled config file not found/);
  });
});
