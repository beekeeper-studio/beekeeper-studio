import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Vue from "vue";
import Vuex from "vuex";
import SettingStoreModule from "@/store/modules/settings/SettingStoreModule";
import { UserSettingValueType } from "@/common/transport/TransportUserSetting";
import { toggleColumnDataTypesMenuItem } from "@/lib/menu/tableMenu";

Vue.use(Vuex);

function buildStore() {
  return new Vuex.Store({
    modules: {
      settings: SettingStoreModule,
    },
    getters: {
      showColumnDataTypes(_state, getters) {
        return getters["settings/showColumnDataTypes"];
      },
    },
  });
}

describe("showColumnDataTypes setting and table menu toggle", () => {
  let send: ReturnType<typeof vi.fn>;
  let setShowColumnDataTypes: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn(async (channel: string, args?: any) => {
      if (channel === "appdb/setting/new") {
        return { key: "", _userValue: null, valueType: UserSettingValueType.boolean, value: true };
      }
      if (channel === "appdb/setting/save") {
        const value = args.obj._userValue === "false" ? false : Boolean(args.obj._userValue ?? args.obj.value);
        return { ...args.obj, value };
      }
      return args?.obj ?? [];
    });
    Vue.prototype.$util = { send };
    setShowColumnDataTypes = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).window = {
      ...(globalThis as any).window,
      main: { setShowColumnDataTypes },
    };
  });

  afterEach(() => {
    if ((globalThis as any).window?.main?.setShowColumnDataTypes === setShowColumnDataTypes) {
      delete (globalThis as any).window.main;
    }
  });

  it("defaults showColumnDataTypes to true and toggles persistently", async () => {
    const store = buildStore();

    expect(store.getters.showColumnDataTypes).toBe(true);

    await store.dispatch("settings/toggleShowColumnDataTypes");
    expect(store.getters.showColumnDataTypes).toBe(false);
    expect(send).toHaveBeenCalledWith("appdb/setting/save", {
      obj: expect.objectContaining({ key: "showColumnDataTypes", _userValue: "false" }),
    });
    expect(setShowColumnDataTypes).toHaveBeenCalledWith(false);

    await store.dispatch("settings/toggleShowColumnDataTypes");
    expect(store.getters.showColumnDataTypes).toBe(true);
    expect(setShowColumnDataTypes).toHaveBeenCalledWith(true);
  });

  it("builds dynamic column menu labels for hiding and showing column data types", () => {
    const onToggle = vi.fn();
    const hideItem = toggleColumnDataTypesMenuItem(true, onToggle);
    const showItem = toggleColumnDataTypesMenuItem(false, onToggle);

    expect(hideItem.label).toContain("Hide column data types");
    expect(showItem.label).toContain("Show column data types");

    hideItem.action?.({} as any, {} as any);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
