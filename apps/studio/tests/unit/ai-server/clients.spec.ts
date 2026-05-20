// Unit tests for the ai-server client approve/deny gate.
// UserSetting is mocked so we don't need the real ORM.

jest.mock("@/common/appdb/models/user_setting", () => {
  const mockStore = new Map<string, any>();
  class FakeUserSetting {
    key!: string;
    valueType = 0;
    defaultValue = "";
    _userValue: string | null = null;
    set value(v: any) {
      this._userValue = typeof v === "string" ? v : JSON.stringify(v);
    }
    get value(): any {
      if (this._userValue == null) {
        try { return JSON.parse(this.defaultValue); } catch { return null; }
      }
      try { return JSON.parse(this._userValue); } catch { return null; }
    }
    static async get(key: string): Promise<FakeUserSetting | null> {
      return mockStore.get(key) ?? null;
    }
    async save(): Promise<void> {
      mockStore.set(this.key, this);
    }
    static __reset(): void {
      mockStore.clear();
    }
  }
  return {
    UserSetting: FakeUserSetting,
    UserSettingValueType: { string: 0, int: 1, float: 2, object: 3, array: 4, boolean: 5 },
  };
});

import {
  identify,
  gate,
  loadClients,
  listClients,
  approveClient,
  denyClient,
  revokeClient,
  resetPending,
  onAccessRequest,
} from "@commercial/backend/ai-server/clients";
import { UserSetting } from "@/common/appdb/models/user_setting";

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  (UserSetting as any).__reset();
  resetPending();
  // loadClients rebuilds the in-memory registry from the (now empty) store.
  await loadClients();
});

describe("ai-server/clients identify", () => {
  it("derives a stable id from the user-agent when no client-id header is sent", () => {
    const a = identify({ "user-agent": "claude-code/1.2" });
    const b = identify({ "user-agent": "claude-code/1.2" });
    expect(a.id).toBe(b.id);
    expect(a.id.startsWith("ua:")).toBe(true);
    expect(a.name).toBe("claude-code/1.2");
  });

  it("uses explicit client-id and client-name headers when present", () => {
    const c = identify({
      "user-agent": "node",
      "x-bks-client-id": "abc123",
      "x-bks-client-name": "Claude Code",
    });
    expect(c.id).toBe("id:abc123");
    expect(c.name).toBe("Claude Code");
  });
});

describe("ai-server/clients gate", () => {
  it("auto-approves an unknown client when prompting is disabled", async () => {
    const identity = identify({ "user-agent": "tool-a" });
    const decision = await gate(identity, "127.0.0.1", false);
    expect(decision).toBe("approved");
    const clients = await listClients();
    expect(clients).toHaveLength(1);
    expect(clients[0].status).toBe("approved");
  });

  it("returns approved/denied immediately for a known client", async () => {
    const identity = identify({ "user-agent": "tool-b" });
    await approveClient(identity.id);
    expect(await gate(identity, "127.0.0.1", true)).toBe("approved");

    const other = identify({ "user-agent": "tool-c" });
    await denyClient(other.id);
    expect(await gate(other, "127.0.0.1", true)).toBe("denied");
  });

  it("blocks an unknown client until the user approves", async () => {
    const identity = identify({ "user-agent": "tool-d" });
    let emitted: string | null = null;
    const off = onAccessRequest((req) => { emitted = req.id; });

    const pending = gate(identity, "127.0.0.1", true);
    await tick();
    expect(emitted).toBe(identity.id);
    // The in-flight request shows up as pending in the list.
    expect((await listClients())[0].status).toBe("pending");

    await approveClient(identity.id);
    expect(await pending).toBe("approved");
    off();
  });

  it("blocks an unknown client until the user denies", async () => {
    const identity = identify({ "user-agent": "tool-e" });
    const pending = gate(identity, "127.0.0.1", true);
    await tick();
    await denyClient(identity.id);
    expect(await pending).toBe("denied");
  });
});

describe("ai-server/clients persistence", () => {
  it("persists approvals across a reload", async () => {
    const identity = identify({ "user-agent": "tool-f" });
    await approveClient(identity.id);
    await loadClients();
    const clients = await listClients();
    expect(clients).toHaveLength(1);
    expect(clients[0].status).toBe("approved");
  });

  it("revoking forgets the client so it prompts again", async () => {
    const identity = identify({ "user-agent": "tool-g" });
    await approveClient(identity.id);
    await revokeClient(identity.id);
    expect(await listClients()).toHaveLength(0);
    await loadClients();
    expect(await listClients()).toHaveLength(0);
  });
});
