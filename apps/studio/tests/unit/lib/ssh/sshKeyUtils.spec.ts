import fs from "fs";
import path from "path";
import tmp from "tmp";
import { utils as ssh2Utils } from "ssh2";
import { loadAllowedPublicKeys } from "@/lib/ssh/sshKeyUtils";

function pubBlob(pub: string): string {
  const parsed = ssh2Utils.parseKey(pub);
  if (parsed instanceof Error) throw parsed;
  const key = Array.isArray(parsed) ? parsed[0] : parsed;
  return key.getPublicSSH().toString("base64");
}

describe("loadAllowedPublicKeys", () => {
  let dir: tmp.DirResult;

  beforeEach(() => {
    dir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    dir.removeCallback();
  });

  it("uses .pub sidecar when present", () => {
    const { private: priv, public: pub } = (ssh2Utils as any).generateKeyPairSync(
      "ed25519"
    );
    const privPath = path.join(dir.name, "id_ed25519");
    fs.writeFileSync(privPath, priv);
    fs.writeFileSync(privPath + ".pub", pub);

    const result = loadAllowedPublicKeys([privPath]);
    expect(result.size).toBe(1);
    expect(result.has(pubBlob(pub))).toBe(true);
  });

  it("derives public key from private key when sidecar is missing", () => {
    const { private: priv, public: pub } = (ssh2Utils as any).generateKeyPairSync(
      "ed25519"
    );
    const privPath = path.join(dir.name, "id_ed25519");
    fs.writeFileSync(privPath, priv);

    const result = loadAllowedPublicKeys([privPath]);
    expect(result.size).toBe(1);
    expect(result.has(pubBlob(pub))).toBe(true);
  });

  it("skips missing files but loads the rest", () => {
    const { private: priv, public: pub } = (ssh2Utils as any).generateKeyPairSync(
      "ed25519"
    );
    const goodPath = path.join(dir.name, "good");
    fs.writeFileSync(goodPath, priv);
    const missingPath = path.join(dir.name, "missing");

    const result = loadAllowedPublicKeys([missingPath, goodPath]);
    expect(result.size).toBe(1);
    expect(result.has(pubBlob(pub))).toBe(true);
  });

  it("returns an empty set when no keys are loadable", () => {
    const garbage = path.join(dir.name, "garbage");
    fs.writeFileSync(garbage, "not a key");
    const result = loadAllowedPublicKeys([garbage]);
    expect(result.size).toBe(0);
  });
});
