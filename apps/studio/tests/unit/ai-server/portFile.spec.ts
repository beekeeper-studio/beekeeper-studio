import fs from "fs";
import os from "os";
import path from "path";

const mockTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-ai-server-"));

jest.mock("@/common/platform_info", () => ({
  __esModule: true,
  default: { userDirectory: mockTmpDir },
}));

import { writePortFile, readPortFile, removePortFile, isStalePortFile, portFilePath } from "@commercial/backend/ai-server/portFile";

const fixture = {
  version: 1 as const,
  host: "127.0.0.1",
  port: 21737,
  token: "abcd",
  pid: process.pid,
  appVersion: "0.0.0-test",
  startedAt: new Date().toISOString(),
};

describe("ai-server/portFile", () => {
  afterEach(() => removePortFile());

  it("writes to userDirectory", () => {
    writePortFile(fixture);
    expect(fs.existsSync(portFilePath())).toBe(true);
    expect(portFilePath()).toContain(mockTmpDir);
  });

  it("file mode is 0600 on POSIX", () => {
    if (process.platform === "win32") return;
    writePortFile(fixture);
    const mode = fs.statSync(portFilePath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("readPortFile round-trips", () => {
    writePortFile(fixture);
    expect(readPortFile()).toEqual(fixture);
  });

  it("readPortFile returns null when missing", () => {
    removePortFile();
    expect(readPortFile()).toBeNull();
  });

  it("readPortFile rejects unknown version", () => {
    fs.writeFileSync(portFilePath(), JSON.stringify({ version: 99 }));
    expect(readPortFile()).toBeNull();
  });

  it("isStalePortFile detects current process", () => {
    expect(isStalePortFile(fixture)).toBe(false);
  });

  it("isStalePortFile flags non-existent pid", () => {
    expect(isStalePortFile({ ...fixture, pid: 0 })).toBe(true);
  });

  it("removePortFile is idempotent", () => {
    expect(() => { removePortFile(); removePortFile(); }).not.toThrow();
  });
});
