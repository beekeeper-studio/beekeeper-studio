import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createEmptyFile } from "@/common/createEmptyFile";

describe("createEmptyFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-create-file-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("creates an empty file where there is none", () => {
    const file = path.join(dir, "new.db");

    createEmptyFile(file);

    expect(fs.statSync(file).isFile()).toBe(true);
    expect(fs.statSync(file).size).toBe(0);
  });

  // The save dialog lets the user pick an existing file, and their data is
  // worth more than an empty database.
  it("leaves a file that is already there as it is", () => {
    const file = path.join(dir, "existing.db");
    fs.writeFileSync(file, "existing data");

    createEmptyFile(file);

    expect(fs.readFileSync(file, "utf8")).toBe("existing data");
  });

  it("throws when the file cannot be created", () => {
    const file = path.join(dir, "missing-folder", "new.db");

    expect(() => createEmptyFile(file)).toThrow(/ENOENT/);
  });
});
