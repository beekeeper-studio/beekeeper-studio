import { TransportPinnedEntity } from "@/common/transport";
import { DatabaseEntity } from "@/lib/db/models";
import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from '../index'
import Vue from "vue";

function matches(pin: TransportPinnedEntity, entity: DatabaseEntity, database?: string) {
  return entity.name === pin.entityName &&
    ((_.isNil(entity.schema) && _.isNil(pin.schemaName)) ||
      entity.schema === pin.schemaName) &&
    entity.entityType === pin.entityType &&
    (!database || database === pin.databaseName)
}

interface State {
  pins: TransportPinnedEntity[],
}

export const PinModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    pins: [],
  }),
  getters: {

    pinned(state: State, _g, root): TransportPinnedEntity[] {
      return state.pins.filter((p) => p.databaseName === root.database)
    },
    orderedPins(_state, getters, rootState): TransportPinnedEntity[] {
      const { tables, routines } = rootState
      return getters.pinned.sort((a, b) => a.position - b.position).map((pin) => {
        const items = [...tables, ...routines]
        const t = items.find((t) => matches(pin, t))
        if (t) pin.entity = t
        return t ? pin : null
      }).filter((p) => !!p)
    },
    pinnedEntities(_state: State, getters): DatabaseEntity[] {
      return getters.orderedPins.map((pin) => pin.entity)
    }
  },
  mutations: {
    set(state, pins: TransportPinnedEntity[]) {
      state.pins = pins
    },
    add(state, newPin: TransportPinnedEntity) {
      state.pins.push(newPin)
    },
    remove(state, pin: TransportPinnedEntity) {
      state.pins = _.without(state.pins, pin)
    },
  },
  actions: {
    async loadPins(context) {
      const { usedConfig } = context.rootState
      if (usedConfig && usedConfig.id) {
        // await usedConfig.reload()
        const pins = await Vue.prototype.$util.send('appdb/pins/find', {
          options: {
            where: {
              connectionId: usedConfig.id,
              workspaceId: usedConfig.workspaceId
            }
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
      // this used to be !p.hasId(), hopefully this still works? the alternative is ugly
      const unsavedPins = context.state.pins.filter((p)=> !p.id)
      await Promise.all(unsavedPins.map((p) => {
        p.connectionId === usedConfig.id && p.workspaceId === usedConfig.id &&
          Vue.prototype.$util.send('appdb/pins/save', { obj: p });
      }))
    },
    async add(context, item: DatabaseEntity) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.pins.find((p) => matches(p, item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        console.log('GETTING NEW PIN: ', item, database, usedConfig)
        let newPin = await Vue.prototype.$util.send('appdb/pins/new', {
          init: {
            table: item,
            db: database,
            saved: usedConfig
          }
        });
        console.log('RECEIVED NEW PIN: ', newPin)
        newPin.position = (context.getters.orderedPins.reverse()[0]?.position || 0) + 1
        if(usedConfig.id) {
          newPin = await Vue.prototype.$util.send('appdb/pins/save', { obj: newPin });
        }
        context.commit('add', newPin)
      }
    },
    async reorder(context, pins: TransportPinnedEntity[]) {
      pins.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', pins)
      if (usedConfig.id) await Vue.prototype.$util.send('appdb/pins/save', { obj: pins });
    },
    async remove(context, item: DatabaseEntity) {
      const { database } = context.rootState

      const existing = context.state.pins.find((p) => matches(p, item, database || undefined))
      if (existing) {
        if (existing.id) await Vue.prototype.$util.send('appdb/pins/remove', { obj: existing })
        context.commit('remove', existing)
      }
    }
  }

}
