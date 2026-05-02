// Unit tests for ai-server options. UserSetting is mocked so we don't need the real ORM.

jest.mock("@/common/appdb/models/user_setting", () => {
  const mockStore = new Map<string, any>();
  class FakeUserSetting {
    key!: string;
    valueType: number = 0;
    defaultValue: string = "";
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

import { loadOptions, saveOptions } from "@commercial/backend/ai-server/options";
import { DEFAULT_OPTIONS } from "@/common/interfaces/IAiServer";
import { UserSetting } from "@/common/appdb/models/user_setting";

beforeEach(() => (UserSetting as any).__reset());

describe("ai-server/options", () => {
  it("returns defaults when nothing is persisted", async () => {
    const opts = await loadOptions();
    expect(opts).toEqual(DEFAULT_OPTIONS);
    expect(opts.requireToken).toBe(true);
    expect(opts.bindLocal).toBe(false);
  });

  it("round-trips saved values", async () => {
    await saveOptions({ requireToken: false, bindLocal: false });
    const loaded = await loadOptions();
    expect(loaded).toEqual({ requireToken: false, bindLocal: false });
  });

  it("forces requireToken true when bindLocal is true", async () => {
    const saved = await saveOptions({ requireToken: false, bindLocal: true });
    expect(saved).toEqual({ requireToken: true, bindLocal: true });
    const loaded = await loadOptions();
    expect(loaded).toEqual({ requireToken: true, bindLocal: true });
  });

  it("coerces malformed values", async () => {
    const saved = await saveOptions({ requireToken: undefined as any, bindLocal: undefined as any });
    expect(saved).toEqual({ requireToken: true, bindLocal: false });
  });
});
