import { TableOrView } from "@/lib/db/models";
import _, { remove } from "lodash";
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
    pinned(state, _g, root) {
      return state.pins.filter((p) => p.databaseName === root.database)
    },
    sortedPins(state) {
      return state.pins.sort((p) => p.position)
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
      context.dispatch('set', pins)
    },
    async add(context, table: TableOrView) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.pins.find((p) => p.matches(table, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const newPin = new PinnedTable(table, database, usedConfig)
        newPin.position = context.getters.sortedPins.reverse()[0] + 1
        if(usedConfig.hasId()) await newPin.save()
        context.dispatch('add', newPin)
      }

    },
    async remove(context, table: TableOrView) {
      const { database } = context.rootState

      const existing = context.state.pins.find((p) => p.matches(table, database || undefined))
      if (existing) {
        if (existing.hasId()) await existing.remove()
        context.dispatch('remove', existing)
      }
    }
  }
  
}