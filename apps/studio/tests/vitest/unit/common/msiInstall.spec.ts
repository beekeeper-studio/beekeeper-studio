import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { isMsiInstall, MSI_MARKER_FILE } from "@/common/msiInstall";

describe("isMsiInstall", () => {
  let installDir: string;
  let execPath: string;

  beforeEach(() => {
    installDir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-install-"));
    execPath = path.join(installDir, "Beekeeper Studio.exe");
  });

  afterEach(() => {
    fs.rmSync(installDir, { recursive: true, force: true });
  });

  it("is true when the MSI marker sits next to the executable", () => {
    fs.writeFileSync(path.join(installDir, MSI_MARKER_FILE), "");
    expect(isMsiInstall(execPath)).toBe(true);
  });

  it("is false for other installs", () => {
    expect(isMsiInstall(execPath)).toBe(false);
  });

  it("ignores a marker in a subdirectory", () => {
    fs.mkdirSync(path.join(installDir, "resources"));
    fs.writeFileSync(path.join(installDir, "resources", MSI_MARKER_FILE), "");
    expect(isMsiInstall(execPath)).toBe(false);
  });
});
