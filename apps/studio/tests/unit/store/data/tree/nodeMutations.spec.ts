import Vue from "vue";
import Vuex, { Store } from "vuex";
import {
  FolderNodeModule,
  State,
} from "@/store/modules/data/tree/FolderNodeModule";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { buildFolderNode } from "@/common/utils/folderTree";
import { FolderNode } from "@beekeeperstudio/ui-kit";

Vue.use(Vuex);

const folder = (id: number, parentId: number, name = "") =>
  ({ id, parentId, name } as IFolder);

function tree(store: Store<{ nodes: State }>) {
  return store.state.nodes.items.filter((i) => i.parentId === null);
}

function node(folder: IFolder, ...children: FolderNode[]) {
  const n = buildFolderNode(folder);
  n.children = children;
  return n;
}

describe("FolderNodeModule", () => {
  let store: Store<{ nodes: State }>;

  beforeEach(() => {
    store = new Vuex.Store({
      modules: { nodes: FolderNodeModule },
    }) as unknown as Store<{ nodes: State }>;
  });

  it("sets correctly", () => {
    const zulu = folder(1, null, "Zulu");
    const acme = folder(2, null, "Acme");

    store.commit("nodes/set", [zulu, acme]);

    expect(tree(store)).toEqual([node(acme), node(zulu)]);
  });

  it("upserts correctly", () => {
    const zulu = folder(1, null, "Zulu");
    const acme = folder(2, null, "Acme");

    store.commit("nodes/set", [zulu]);
    store.commit("nodes/upsert", acme);

    expect(tree(store)).toEqual([node(acme), node(zulu)]);
  });

  it("inserts nodes arriving in the payload", () => {
    const acme = folder(1, 10, "Acme");
    const bravo = folder(2, 10, "Bravo");
    store.commit("nodes/set", [acme]);
    store.commit("nodes/replace", {
      items: [acme, bravo],
      replaceIf: (i) => i.parentId === 10,
    });

    expect(store.state.nodes.items).toStrictEqual([node(acme), node(bravo)]);
  });

  it("updates an existing node", () => {
    const old = folder(1, 10, "old");
    const updated = folder(1, 10, "new");

    store.commit("nodes/set", [old]);

    expect(store.state.nodes.items).toStrictEqual([node(old)]);

    store.commit("nodes/replace", {
      items: [updated],
      replaceIf: (i) => i.parentId === updated.parentId,
    });

    expect(store.state.nodes.items).toStrictEqual([node(updated)]);
  });

  it("removes in-scope nodes missing from the payload", () => {
    store.commit("nodes/set", [folder(1, 10), folder(2, 10)]);
    store.commit("nodes/replace", {
      items: [folder(1, 10)],
      replaceIf: (i) => i.parentId === 10,
    });

    expect(store.state.nodes.items).toStrictEqual([node(folder(1, 10))]);
  });

  it("stays alphabetical whatever order the mutations arrive in", () => {
    const zulu = folder(1, null, "Zulu");
    const acme = folder(2, null, "Acme");
    const mango = folder(3, null, "Mango");
    const bravo = folder(4, null, "Bravo");
    const delta = folder(5, null, "Delta");

    store.commit("nodes/set", [zulu, acme]);
    store.commit("nodes/upsert", [mango, bravo]);
    store.commit("nodes/replace", {
      items: [delta, zulu, acme, mango, bravo],
      replaceIf: (i) => i.parentId === delta.parentId,
    });
    store.commit("nodes/remove", mango);

    expect(tree(store)).toEqual([
      node(acme),
      node(bravo),
      node(delta),
      node(zulu),
    ]);
  });

  it("stays alphabetical at every level of a nested tree", () => {
    const team = folder(1, null, "Team");
    const personal = folder(6, null, "Personal");
    const zulu = folder(2, 1, "Zulu");
    const acme = folder(3, 1, "Acme");
    const yankee = folder(5, 3, "Yankee");
    const bravo = folder(4, 3, "Bravo");
    const charlie = folder(7, 3, "Charlie");
    const delta = folder(8, 6, "Delta");
    const echo = folder(9, 8, "Echo");

    store.commit("nodes/set", [team, personal]);
    store.commit("nodes/upsert", [zulu, acme, yankee, bravo, echo, delta]);
    store.commit("nodes/replace", {
      items: [charlie, yankee, bravo],
      replaceIf: (i) => i.parentId === charlie.parentId,
    });
    store.commit("nodes/remove", folder(5, 3, "Yankee"));

    expect(tree(store)).toEqual([
      node(personal, node(delta, node(echo))),
      node(team, node(acme, node(bravo), node(charlie)), node(zulu)),
    ]);
  });
});
