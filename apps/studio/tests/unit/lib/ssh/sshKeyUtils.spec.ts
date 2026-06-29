import fs from "fs";
import path from "path";
import tmp from "tmp";
import { utils as ssh2Utils } from "ssh2";
import { loadAllowedPublicKeys } from "@/lib/ssh/sshKeyUtils";

// Static ed25519 fixture generated with `ssh-keygen -t ed25519`. We do NOT use
// ssh2's generateKeyPairSync here: it intermittently emits ed25519 keys that
// ssh2's own parseKey can't read (mscdex/ssh2#1390), which made this test flaky.
// A fixed, known-good key keeps it deterministic and still exercises the real
// parse/derive path against ssh-keygen output (what users actually have).
const PRIVATE_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACC2lG8CqrSQ9fwwMqlCJXUPF1f0LhqVGwH6WFirTq/a2gAAAJhTilfNU4pX
zQAAAAtzc2gtZWQyNTUxOQAAACC2lG8CqrSQ9fwwMqlCJXUPF1f0LhqVGwH6WFirTq/a2g
AAAEB2Vg3yl/zjO5cnzVAtDwaYOijKRftatbamaYMey2PL/LaUbwKqtJD1/DAyqUIldQ8X
V/QuGpUbAfpYWKtOr9raAAAAEGJrcy10ZXN0LWZpeHR1cmUBAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
`;
const PUBLIC_KEY = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILaUbwKqtJD1/DAyqUIldQ8XV/QuGpUbAfpYWKtOr9ra bks-test-fixture
`;

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
    const priv = PRIVATE_KEY, pub = PUBLIC_KEY;
    const privPath = path.join(dir.name, "id_ed25519");
    fs.writeFileSync(privPath, priv);
    fs.writeFileSync(privPath + ".pub", pub);

    const result = loadAllowedPublicKeys([privPath]);
    expect(result.size).toBe(1);
    expect(result.has(pubBlob(pub))).toBe(true);
  });

  it("derives public key from private key when sidecar is missing", () => {
    const priv = PRIVATE_KEY, pub = PUBLIC_KEY;
    const privPath = path.join(dir.name, "id_ed25519");
    fs.writeFileSync(privPath, priv);

    const result = loadAllowedPublicKeys([privPath]);
    expect(result.size).toBe(1);
    expect(result.has(pubBlob(pub))).toBe(true);
  });

  it("skips missing files but loads the rest", () => {
    const priv = PRIVATE_KEY, pub = PUBLIC_KEY;
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
