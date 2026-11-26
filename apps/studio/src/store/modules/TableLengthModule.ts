import Vue from 'vue';
import { Module } from 'vuex';
import { State as RootState } from '../index';

export interface TableLengthTarget {
  name?: string;
  schema?: string;
  entityType?: string;
}

export interface TableLengthEntry {
  count: number;
  fetchedAt: number;
}

export interface TableLengthState {
  counts: Record<string, TableLengthEntry>;
}

/** Builds a cache key scoped to database, namespace, schema, entity type, and table name. */
export function tableLengthKey(
  table: TableLengthTarget | null | undefined,
  database?: string | null,
  namespace?: string | null,
): string | null {
  if (!table?.name) return null;
  return JSON.stringify([
    database ?? '',
    namespace ?? '',
    table.schema ?? '',
    table.entityType ?? '',
    table.name,
  ]);
}

let nextStamp = 1;

export const TableLengthModule: Module<TableLengthState, RootState> = {
  namespaced: true,
  state: () => ({
    counts: {},
  }),
  getters: {
    getEntry: (state, _getters, rootState) => (table: TableLengthTarget | null | undefined): TableLengthEntry | null => {
      const key = tableLengthKey(table, rootState.database, rootState.namespace);
      if (!key) return null;
      return state.counts[key] ?? null;
    },
  },
  mutations: {
    setEntry(state, { key, count }: { key: string; count: number }) {
      Vue.set(state.counts, key, {
        count,
        fetchedAt: nextStamp++,
      });
    },
    removeEntry(state, key: string) {
      Vue.delete(state.counts, key);
    },
    clearAll(state) {
      state.counts = {};
    },
  },
  actions: {
    setCount({ commit, rootState }, { table, count }: { table: TableLengthTarget | null | undefined; count: number }) {
      const key = tableLengthKey(table, rootState.database, rootState.namespace);
      if (!key) return;
      commit('setEntry', { key, count });
    },
    invalidate({ commit, rootState }, table: TableLengthTarget | null | undefined) {
      const key = tableLengthKey(table, rootState.database, rootState.namespace);
      if (!key) return;
      commit('removeEntry', key);
    },
    clear({ commit }) {
      commit('clearAll');
    },
  },
};
