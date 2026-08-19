import Vue from "vue";
import Vuex, { Store } from "vuex";
import { ItemNodeModule } from "@/store/modules/data/tree/ItemNodeModule";
import { ExtendedItemNode } from "@/common/utils/folderTree";

Vue.use(Vuex);

type State = { items: ExtendedItemNode[] };

function connection(id: number, name: string, position: number) {
  return {
    id,
    connectionFolderId: 10,
    name,
    position,
  };
}

function order(store: Store<{ nodes: State }>) {
  return store.state.nodes.items.map((i) => i.name);
}

describe("ItemNodeModule", () => {
  it("stays ordered by position whatever order the mutations arrive in", () => {
    const store = new Vuex.Store({
      modules: {
        nodes: ItemNodeModule("connectionFolderId", "name"),
      },
    }) as unknown as Store<{ nodes: State }>;

    const alpha = connection(1, "Alpha", 1);
    const bravo = connection(2, "Bravo", 2);
    const charlie = connection(3, "Charlie", 3);
    const delta = connection(4, "Delta", 4);

    store.commit("nodes/set", [charlie, alpha]);
    expect(order(store)).toEqual(["Alpha", "Charlie"]);

    store.commit("nodes/upsert", delta);
    store.commit("nodes/upsert", bravo);
    expect(order(store)).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);

    store.commit("nodes/replace", [delta, charlie, alpha, bravo]);
    expect(order(store)).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);

    store.commit("nodes/replace", {
      items: [{ ...alpha, position: 5 }, delta],
      replaceIf: (i) => i.connectionFolderId === 10,
    });
    expect(order(store)).toEqual(["Delta", "Alpha"]);

    store.commit("nodes/remove", delta);
    expect(order(store)).toEqual(["Alpha"]);
  });
});
