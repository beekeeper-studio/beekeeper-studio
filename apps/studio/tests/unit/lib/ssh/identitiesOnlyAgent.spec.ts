import { utils as ssh2Utils, BaseAgent, OpenSSHAgent } from "ssh2";
import { createFilteringAgent } from "@/lib/ssh/identitiesOnlyAgent";

// Static ed25519 public keys (ssh-keygen). We deliberately avoid ssh2's
// generateKeyPairSync, which intermittently emits ed25519 keys its own parseKey
// can't read (mscdex/ssh2#1390) — that made these tests flaky.
const PUBLIC_KEYS = [
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOnHMHf4VaHPPteukYnEVzZVEMgbhodvJm7uSTUYWNez bks-test-fixture-1",
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFJeZ1/S91hgvF/45m9O3Oh5cM9GIK7F6XAY3MA0z3Cl bks-test-fixture-2",
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMtLAtRTFfXgC/ut/sFYyED0MqAfsauERdhf94yS9OWn bks-test-fixture-3",
];

function makeKey(index: number) {
  const parsed = ssh2Utils.parseKey(PUBLIC_KEYS[index]);
  if (parsed instanceof Error) throw parsed;
  const key = Array.isArray(parsed) ? parsed[0] : parsed;
  return { key, blob: key.getPublicSSH().toString("base64") };
}

function callIdentities(agent: BaseAgent): Promise<any[]> {
  return new Promise((resolve, reject) => {
    agent.getIdentities((err, keys) => {
      if (err) return reject(err);
      resolve(keys || []);
    });
  });
}

describe("createFilteringAgent", () => {
  it("filters agent identities to those matching the allowed set", async () => {
    const a = makeKey(0);
    const b = makeKey(1);
    const c = makeKey(2);

    jest
      .spyOn(OpenSSHAgent.prototype, "getIdentities")
      .mockImplementation(function (cb: any) {
        cb(null, [a.key, b.key, c.key]);
      });

    const agent = createFilteringAgent({
      socketPath: "/tmp/fake.sock",
      isWindows: false,
      allowedPublicKeys: new Set([a.blob, c.blob]),
    });

    const keys = await callIdentities(agent);
    expect(keys.map((k) => k.getPublicSSH().toString("base64"))).toEqual([
      a.blob,
      c.blob,
    ]);

    jest.restoreAllMocks();
  });

  it("does not filter when allowed set is empty", async () => {
    const a = makeKey(0);
    const b = makeKey(1);

    jest
      .spyOn(OpenSSHAgent.prototype, "getIdentities")
      .mockImplementation(function (cb: any) {
        cb(null, [a.key, b.key]);
      });

    const agent = createFilteringAgent({
      socketPath: "/tmp/fake.sock",
      isWindows: false,
      allowedPublicKeys: new Set(),
    });

    const keys = await callIdentities(agent);
    expect(keys).toHaveLength(2);

    jest.restoreAllMocks();
  });

  it("propagates errors from the underlying agent", async () => {
    jest
      .spyOn(OpenSSHAgent.prototype, "getIdentities")
      .mockImplementation(function (cb: any) {
        cb(new Error("boom"));
      });

    const agent = createFilteringAgent({
      socketPath: "/tmp/fake.sock",
      isWindows: false,
      allowedPublicKeys: new Set(["whatever"]),
    });

    await expect(callIdentities(agent)).rejects.toThrow("boom");

    jest.restoreAllMocks();
  });
});
