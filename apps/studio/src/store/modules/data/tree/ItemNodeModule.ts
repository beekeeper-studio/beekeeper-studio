import { Module } from "vuex";
import _ from "lodash";
import { State as RootState } from "@/store";
import { HasId } from "@/common/interfaces/IGeneric";
import {
  ExtendedItemNode as Node,
  buildItemNodes,
} from "@/common/utils/folderTree";

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
      replace(state, items: HasId[]) {
        state.items = buildItemNodes(items, parentIdKey, nameKey);
      },
      upsert(state, items: HasId | HasId[]) {
        const next = [...state.items];
        const nodes = buildItemNodes(asArray(items), parentIdKey, nameKey);
        for (const node of nodes) {
          const index = next.findIndex((i) => i.id === node.id);
          if (index === -1) {
            next.push(node);
          } else {
            next.splice(index, 1, node);
          }
        }
        state.items = next;
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
