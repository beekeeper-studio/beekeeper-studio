import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { canParseKey } from "@/lib/ssh/sshKeyUtils";

describe("canParseKey", () => {
  let dir: string, priv: string, pub: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-ssh-"));
    priv = path.join(dir, "id_ed25519");
    pub = `${priv}.pub`;
    execFileSync("ssh-keygen", ["-t", "ed25519", "-N", "", "-C", "test", "-f", priv]);
  });

  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("accepts a private key", () => {
    expect(canParseKey(priv)).toBe(true);
  });

  // Regression test for #4643.
  it("rejects a public key", () => {
    expect(canParseKey(pub)).toBe(false);
  });
});
