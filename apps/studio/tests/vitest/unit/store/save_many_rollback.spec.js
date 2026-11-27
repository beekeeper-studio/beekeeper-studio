import { describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import { CloudConnectionModule } from "@/store/modules/data/connection/CloudConnectionModule";

function localContext(items, send) {
  const state = { items, loading: false, error: null, pendingSaveIds: [] };
  const mutations = mutationsFor();
  const actions = utilActionsFor("connection");
  const context = {
    state,
    commit(type, payload) {
      mutations[type](state, payload);
    },
    dispatch(name, payload) {
      if (name === "mutate") {
        mutations[payload.type](state, payload.data);
      }
    },
  };
  Vue.prototype.$util = { send };
  return { state, context, actions };
}

describe("saveMany rollback", () => {
  it("restores the previous local rows when a save fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("disk full"));
    const { state, context, actions } = localContext(
      [{ id: 1, name: "old", position: 1 }],
      send
    );

    await expect(actions.saveMany(context, [{ id: 1, name: "new", position: 2 }]))
      .rejects.toThrow("disk full");

    expect(state.items).toEqual([{ id: 1, name: "old", position: 1 }]);
  });

  it("restores cloud connections and clears the pending flag", async () => {
    const state = {
      items: [{ id: 4, name: "old", position: 1 }],
      loading: false,
      error: null,
      pendingSaveIds: [],
    };
    const mutations = CloudConnectionModule.mutations;
    const context = {
      state,
      rootGetters: {
        cloudClient: {
          connections: {
            upsert: vi.fn().mockRejectedValue(new Error("offline")),
          },
        },
      },
      commit(type, payload) {
        mutations[type](state, payload);
      },
      dispatch(name, payload) {
        if (name === "mutate") {
          mutations[payload.type](state, payload.data);
        }
      },
    };

    await expect(CloudConnectionModule.actions.saveMany(
      context,
      [{ id: 4, name: "new", position: 2 }]
    )).rejects.toThrow("offline");

    expect(state.items).toEqual([{ id: 4, name: "old", position: 1 }]);
    expect(state.pendingSaveIds).toEqual([]);
  });
});
