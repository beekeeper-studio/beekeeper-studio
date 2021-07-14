import { TableOrView } from "@/lib/db/models";
import _ from "lodash";
import { Module } from "vuex";
import { PinnedTable } from "../../common/appdb/models/pinned_table";
import { State as RootState } from '../index'
interface State {
  pins: PinnedTable[]
}

export const PinModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pins: []
  }),
  getters: {
    pinned(state, _g, root): PinnedTable[] {
      return state.pins.filter((p) => p.databaseName === root.database)
    },
    sortedPins(state): PinnedTable[] {
      return state.pins.sort((p) => p.position)
    },
    pinnedTables(_state, getters, rootState): TableOrView[] {
      const { tables } = rootState
      return getters.sortedPins.map((p: PinnedTable) => {
        return tables.find((t) => p.matches(t))
      }).filter((t) => !!t)
    }
  },
  mutations: {
    set(state, pins: PinnedTable[]) {
      state.pins = pins
    },
    add(state, newPin: PinnedTable) {
      state.pins.push(newPin)
    },
    remove(state, pin: PinnedTable) {
      state.pins = _.without(state.pins, pin)
    }
  },
  actions: {
    async loadPins(context) {
      const { usedConfig } = context.rootState
      const pins = usedConfig?.pinnedTables.sort((p) => p.position)
      context.commit('set', pins)
    },
    async add(context, table: TableOrView) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.pins.find((p) => p.matches(table, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const newPin = new PinnedTable(table, database, usedConfig)
        newPin.position = (context.getters.sortedPins.reverse()[0]?.position || 0) + 1
        console.log('saving pin', newPin)
        if(usedConfig.hasId()) await newPin.save()
        context.commit('add', newPin)
      }
    },
    async reorder(context, pins: PinnedTable[]) {
      pins.forEach((p, idx) => p.position = idx)
    },
    async remove(context, table: TableOrView) {
      const { database } = context.rootState

      const existing = context.state.pins.find((p) => p.matches(table, database || undefined))
      if (existing) {
        if (existing.hasId()) await existing.remove()
        context.commit('remove', existing)
      }
    }
  }
  
}