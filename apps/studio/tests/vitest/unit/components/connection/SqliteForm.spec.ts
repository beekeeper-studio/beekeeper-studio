import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import SqliteForm from "@/components/connection/SqliteForm.vue";

Vue.use(Vuex);

function mountForm(options: Record<string, unknown> = { connectionMethod: "manual" }) {
  const store = new Vuex.Store({
    getters: { isUltimate: () => false },
    modules: {
      settings: {
        namespaced: true,
        getters: { sqliteRuntimeExtensions: () => ({ value: [] }) },
      },
    },
  });
  const config = Vue.observable({ defaultDatabase: "", options });
  const wrapper = mount(SqliteForm, {
    store,
    propsData: { config },
    stubs: { ToggleFormArea: true, PlatformWarning: true },
    mocks: {
      $config: { isMac: true, isWindows: false },
      $bksConfig: { security: { allowRuntimeExtensions: false } },
      $native: {
        dialog: {
          showOpenDialogSync: vi.fn(() => ["/existing.db"]),
          showSaveDialogSync: vi.fn(() => "/new.db"),
        },
      },
    },
  });
  return { wrapper, config };
}

const input = (wrapper) => wrapper.find("#Database");
const button = (wrapper, text: string) =>
  wrapper.findAll("a").filter((a) => a.text() === text).at(0);

// SQLite refuses to connect to a missing file, so a mistyped path can't
// silently become a new database. Create is the explicit way to get one: it
// sets createDatabaseFile, and the path is locked until cleared (#4854).
describe("SqliteForm database file", () => {
  it("can be typed into by default", () => {
    const { wrapper } = mountForm();

    expect(input(wrapper).attributes("readonly")).toBeUndefined();
    wrapper.destroy();
  });

  it("sets createDatabaseFile and locks the path on Create", async () => {
    const { wrapper, config } = mountForm();

    await button(wrapper, "Create").trigger("click");

    expect(config.defaultDatabase).toBe("/new.db");
    expect(config.options).toEqual({ connectionMethod: "manual", createDatabaseFile: true });
    expect(input(wrapper).attributes("readonly")).toBe("readonly");
    wrapper.destroy();
  });

  it("unsets createDatabaseFile and unlocks the path on clear", async () => {
    const { wrapper, config } = mountForm({ createDatabaseFile: true });
    config.defaultDatabase = "/new.db";
    await Vue.nextTick();

    await button(wrapper, "close").trigger("click");

    expect(config.defaultDatabase).toBe("");
    expect(config.options.createDatabaseFile).toBe(false);
    expect(input(wrapper).attributes("readonly")).toBeUndefined();
    wrapper.destroy();
  });

  it("unsets createDatabaseFile when an existing file is chosen", async () => {
    const { wrapper, config } = mountForm({ createDatabaseFile: true });

    await button(wrapper, "Choose File").trigger("click");

    expect(config.defaultDatabase).toBe("/existing.db");
    expect(config.options.createDatabaseFile).toBe(false);
    wrapper.destroy();
  });
});
