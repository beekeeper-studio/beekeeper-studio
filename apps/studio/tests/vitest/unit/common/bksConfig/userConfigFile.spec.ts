/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import os from "os";
import path from "path";
import {
  ensureConfigFile,
  userConfigPath,
  loadConfig,
  USER_CONFIG_TEMPLATE,
} from "@/common/bksConfig/mainBksConfig";

// A packaged (non-dev) build, so the user config lives in userDirectory.
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

let userDir: string;

beforeEach(() => {
  userDir = mkdtempSync(path.join(os.tmpdir(), "bks-user-config-"));
  mockPlatformInfo.userDirectory = userDir;
});

afterEach(() => {
  rmSync(userDir, { recursive: true, force: true });
});

describe("userConfigPath", () => {
  it("points at user.config.ini in the user directory", () => {
    expect(userConfigPath()).toBe(path.join(userDir, "user.config.ini"));
  });
});

describe("ensureConfigFile", () => {
  it("creates the file from the template when it doesn't exist", () => {
    const file = userConfigPath();

    expect(ensureConfigFile(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toBe(USER_CONFIG_TEMPLATE);
  });

  it("creates missing parent directories", () => {
    const file = path.join(userDir, "nested", "dir", "user.config.ini");

    expect(ensureConfigFile(file)).toBe(true);
    expect(existsSync(file)).toBe(true);
  });

  it("never overwrites an existing file", () => {
    const file = userConfigPath();
    writeFileSync(file, "[ui.tableTable]\npageSize = 200\n");

    expect(ensureConfigFile(file)).toBe(false);
    expect(readFileSync(file, "utf-8")).toBe("[ui.tableTable]\npageSize = 200\n");
  });

  it("writes a template that loads as an empty config", () => {
    ensureConfigFile(userConfigPath());

    // Only comments, so no settings (the parser keeps comments under a Symbol key)
    expect(Object.keys(loadConfig("user.config.ini"))).toEqual([]);
  });
});
