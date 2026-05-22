import { utils as ssh2Utils, BaseAgent, OpenSSHAgent } from "ssh2";
import { createFilteringAgent } from "@/lib/ssh/identitiesOnlyAgent";

function makeKey() {
  const { public: pub } = (ssh2Utils as any).generateKeyPairSync("ed25519");
  const parsed = ssh2Utils.parseKey(pub);
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
    const a = makeKey();
    const b = makeKey();
    const c = makeKey();

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
    const a = makeKey();
    const b = makeKey();

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
