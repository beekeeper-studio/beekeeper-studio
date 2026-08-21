import { Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import { HasId } from "@/common/interfaces/IGeneric";
import {
  ExtendedItemNode as Node,
  buildItemNodes,
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
  function applyUpsert(existing: Node[], items: HasId[]): Node[] {
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
    return next;
  }

  return {
    namespaced: true,
    state() {
      return {
        items: [],
      };
    },
    mutations: {
      set(state, items: HasId | HasId[]) {
        state.items = buildItemNodes(asArray(items), parentIdKey, nameKey);
      },
      /** A scoped payload only speaks for its own slice, so nodes outside it survive. */
      replace(state, payload: ReplacePayload<HasId>) {
        const { items, replaceIf } = _.isArray(payload)
          ? { items: payload, replaceIf: null }
          : payload;

        if (!replaceIf) {
          state.items = buildItemNodes(items, parentIdKey, nameKey);
          return;
        }

        const ids = items.map((i) => `item-${i.id}`);
        const kept = state.items.filter(
          (i) => ids.includes(i.id) || !replaceIf(i.ref)
        );
        state.items = applyUpsert(kept, items);
      },
      upsert(state, items: HasId | HasId[]) {
        state.items = applyUpsert(state.items, asArray(items));
      },
      remove(state, items: HasId | HasId[] | number) {
        const ids = asArray(items).map(
          (item) => `item-${_.isNumber(item) ? item : item.id}`
        );
        state.items = state.items.filter((i) => !ids.includes(i.id));
      },
    },
  };
}
