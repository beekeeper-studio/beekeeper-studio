import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  defaultCliSocketPath,
  isWindowsPipePath,
  resolveCliSocketPath,
  UNIX_SOCKET_PATH_LIMIT,
} from "../src/socketPath";

describe("resolveCliSocketPath", () => {
  it("puts the socket in the user directory", () => {
    const path = resolveCliSocketPath({
      userDirectory: "/home/me/.config/beekeeper-studio",
      isWindows: false,
      isDevelopment: false,
    });
    expect(path).toBe("/home/me/.config/beekeeper-studio/cli.sock");
    expect(isWindowsPipePath(path)).toBe(false);
  });

  it("keeps dev and production sockets apart", () => {
    const prod = resolveCliSocketPath({
      userDirectory: "/data",
      isWindows: false,
      isDevelopment: false,
    });
    const dev = resolveCliSocketPath({
      userDirectory: "/data",
      isWindows: false,
      isDevelopment: true,
    });
    expect(dev).not.toBe(prod);
    expect(dev).toBe("/data/cli-dev.sock");
  });

  it("falls back to the temp directory when the path would be too long", () => {
    const userDirectory = "/" + "x".repeat(UNIX_SOCKET_PATH_LIMIT);
    const path = resolveCliSocketPath({
      userDirectory,
      isWindows: false,
      isDevelopment: false,
      tmpDir: "/tmp",
    });
    expect(path.startsWith("/tmp/beekeeper-studio-cli-")).toBe(true);
    expect(path.length).toBeLessThan(UNIX_SOCKET_PATH_LIMIT);
    // the same user directory always maps to the same socket
    expect(
      resolveCliSocketPath({
        userDirectory,
        isWindows: false,
        isDevelopment: false,
        tmpDir: "/tmp",
      }),
    ).toBe(path);
  });

  it("uses a named pipe on windows", () => {
    const path = resolveCliSocketPath({
      userDirectory: "C:\\Users\\me\\AppData\\Roaming\\beekeeper-studio",
      isWindows: true,
      isDevelopment: false,
    });
    expect(path.startsWith("\\\\.\\pipe\\beekeeper-studio-cli-")).toBe(true);
    expect(isWindowsPipePath(path)).toBe(true);
  });

  it("ignores path casing on windows", () => {
    const lower = resolveCliSocketPath({
      userDirectory: "c:\\users\\me\\appdata\\roaming\\beekeeper-studio",
      isWindows: true,
      isDevelopment: false,
    });
    const mixed = resolveCliSocketPath({
      userDirectory: "C:\\Users\\Me\\AppData\\Roaming\\beekeeper-studio",
      isWindows: true,
      isDevelopment: false,
    });
    expect(lower).toBe(mixed);
    // elsewhere paths are case sensitive, so the hash must stay case sensitive too
    const a = resolveCliSocketPath({
      userDirectory: "/" + "A".repeat(UNIX_SOCKET_PATH_LIMIT),
      isWindows: false,
      isDevelopment: false,
      tmpDir: "/tmp",
    });
    const b = resolveCliSocketPath({
      userDirectory: "/" + "a".repeat(UNIX_SOCKET_PATH_LIMIT),
      isWindows: false,
      isDevelopment: false,
      tmpDir: "/tmp",
    });
    expect(a).not.toBe(b);
  });
});

describe("defaultCliSocketPath", () => {
  beforeEach(() => {
    vi.stubEnv("BKS_CLI_SOCKET", "");
    vi.stubEnv("BKS_CLI_DEV", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the production socket", () => {
    const path = defaultCliSocketPath();
    expect(path).not.toContain("cli-dev");
    expect(isWindowsPipePath(path)).toBe(process.platform === "win32");
  });

  it("targets the development socket with BKS_CLI_DEV", () => {
    vi.stubEnv("BKS_CLI_DEV", "1");
    const path = defaultCliSocketPath();
    vi.stubEnv("BKS_CLI_DEV", "false");
    expect(path).not.toBe(defaultCliSocketPath());
  });

  it("lets BKS_CLI_SOCKET override everything", () => {
    vi.stubEnv("BKS_CLI_SOCKET", " /tmp/custom.sock ");
    vi.stubEnv("BKS_CLI_DEV", "1");
    expect(defaultCliSocketPath()).toBe("/tmp/custom.sock");
  });
});
