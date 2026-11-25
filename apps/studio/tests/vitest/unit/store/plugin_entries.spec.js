import { describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { PluginEntriesModule } from "@/store/modules/plugins/PluginEntriesModule";

describe("PluginEntriesModule", () => {
  it("records registry errors instead of treating them as an empty list", async () => {
    const send = vi.fn().mockResolvedValue({
      entries: { official: [{ id: "demo" }], community: [] },
      errors: ["community registry failed"],
    });
    Vue.prototype.$util = { send };

    const state = { entries: null, loading: false, error: "stale" };
    const context = {
      commit(type, payload) {
        PluginEntriesModule.mutations[type](state, payload);
      },
    };

    await PluginEntriesModule.actions.load(context);

    expect(send).toHaveBeenCalledWith("plugin/entries", { clearCache: true });
    expect(state.entries).toEqual({ official: [{ id: "demo" }], community: [] });
    expect(state.error).toBe("community registry failed");
    expect(state.loading).toBe(false);
  });
});
