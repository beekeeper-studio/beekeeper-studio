import { Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import {
  ExtendedItemNode as Node,
  buildItemNodes,
  Item,
} from "@/common/utils/folderTree";
import { ReplacePayload } from "@/store/modules/data/DataModuleBase";

type State = {
  items: Node[];
};

const asArray = <T>(value: T | T[]): T[] =>
  _.isArray(value) ? value : [value];

/**
 * Used for tree visualization using <tree> component
 **/
export function ItemNodeModule(
  parentIdKey: string,
  nameKey: string
): Module<State, RootState> {
  function applyUpsert(existing: Node[], items: Item[]): Node[] {
    const next = [...existing];
    const nodes = buildItemNodes(items, parentIdKey, nameKey);
    for (const node of nodes) {
      const index = next.findIndex((i) => i.id === node.id);
      if (index === -1) {
        next.push(node);
      } else {
        next.splice(index, 1, node);
      }
    }
    return _.sortBy(next, (node) => node.ref.position ?? 0);
  }

  return {
    namespaced: true,
    state() {
      return {
        items: [],
      };
    },
    mutations: {
      set(state, items: Item | Item[]) {
        const nodes = buildItemNodes(asArray(items), parentIdKey, nameKey);
        state.items = _.sortBy(nodes, (n) => n.ref.position ?? 0);
      },
      /** A scoped payload only speaks for its own slice, so nodes outside it survive. */
      replace(state, payload: ReplacePayload<Item>) {
        const { items, replaceIf } = _.isArray(payload)
          ? { items: payload, replaceIf: null }
          : payload;

        if (!replaceIf) {
          const nodes = buildItemNodes(items, parentIdKey, nameKey);
          state.items = _.sortBy(nodes, (n) => n.ref.position ?? 0);
          return;
        }

        const ids = items.map((i) => `item-${i.id}`);
        const kept = state.items.filter(
          (i) => ids.includes(i.id) || !replaceIf(i.ref)
        );
        state.items = applyUpsert(kept, items);
      },
      upsert(state, items: Item | Item[]) {
        state.items = applyUpsert(state.items, asArray(items));
      },
      remove(state, items: Item | Item[] | number) {
        const ids = asArray(items).map(
          (item) => `item-${_.isNumber(item) ? item : item.id}`
        );
        state.items = state.items.filter((i) => !ids.includes(i.id));
      },
    },
  };
}
