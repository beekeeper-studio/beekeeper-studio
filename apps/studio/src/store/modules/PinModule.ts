import { DatabaseEntity } from "@/lib/db/models";
import _ from "lodash";
import { Module } from "vuex";
import { PinnedEntity } from "../../common/appdb/models/PinnedEntity";
import { State as RootState } from '../index'
interface State {
  pins: PinnedEntity[]
}

export const PinModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pins: []
  }),
  getters: {
    pinned(state: State, _g, root): PinnedEntity[] {
      return state.pins.filter((p) => p.databaseName === root.database)
    },
    orderedPins(_state, getters, rootState): PinnedEntity[] {
      const { tables, routines } = rootState
      return getters.pinned.sort((a, b) => a.position - b.position).map((pin) => {
        const items = [...tables, ...routines]
        const t = items.find((t) => pin.matches(t))
        if (t) pin.entity = t
        return t ? pin : null
      }).filter((p) => !!p)
    },
    pinnedEntities(_state: State, getters): DatabaseEntity[] {
      return getters.orderedPins.map((pin) => pin.entity)
    }
  },
  mutations: {
    set(state, pins: PinnedEntity[]) {
      state.pins = pins
    },
    add(state, newPin: PinnedEntity) {
      state.pins.push(newPin)
    },
    remove(state, pin: PinnedEntity) {
      state.pins = _.without(state.pins, pin)
    }
  },
  actions: {
    async loadPins(context) {
      const { usedConfig } = context.rootState
      if (usedConfig && usedConfig.id) {
        // await usedConfig.reload()
        const pins = await PinnedEntity.find({
          where: {
            connectionId: usedConfig.id,
            workspaceId: usedConfig.workspaceId
          }
        })
        context.commit('set', pins || [])
      }
    },
    async unloadPins(context) {
      context.commit('set', [])
    },
    async maybeSavePins(context) {
      const { usedConfig } = context.rootState
      const unsavedPins = context.state.pins.filter((p)=> !p.hasId())
      await Promise.all(unsavedPins.map((p) => {
        p.connectionId === usedConfig.id && p.workspaceId === usedConfig.id
        p.save()
      }))
    },
    async add(context, item: DatabaseEntity) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.pins.find((p) => p.matches(item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const newPin = new PinnedEntity(item, database, usedConfig)
        newPin.position = (context.getters.orderedPins.reverse()[0]?.position || 0) + 1
        if(usedConfig.id) await newPin.save()
        context.commit('add', newPin)
      }
    },
    async reorder(context, pins: PinnedEntity[]) {
      pins.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', pins)
      if (usedConfig.id) await PinnedEntity.save(pins)
    },
    async remove(context, item: DatabaseEntity) {
      const { database } = context.rootState

      const existing = context.state.pins.find((p) => p.matches(item, database || undefined))
      if (existing) {
        if (existing.id) await existing.remove()
        context.commit('remove', existing)
      }
    }
  }
  
}