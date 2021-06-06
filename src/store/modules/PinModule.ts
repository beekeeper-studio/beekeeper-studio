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
    async add(context, newPin: PinnedTable) {
      if (newPin.savedConnection?.id) {
        await newPin.save()
      }
      context.dispatch('add', newPin)
    },
    async remove(context, pin: PinnedTable) {
      if (pin.id) {
        await pin.remove()
      }
      context.dispatch('remove', pin)
    }
  }
  
}