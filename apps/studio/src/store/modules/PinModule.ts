import { TransportPinnedEntity } from "@/common/transport/TransportPinnedEntity";
import { IConnection } from "@/common/interfaces/IConnection";
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

// A pin belongs to the session if it carries its connection and workspace, or
// was made while the connection was still unsaved and so has no connection id
function belongsToSession(pin: TransportPinnedEntity, usedConfig: IConnection): boolean {
  return (_.isNil(pin.connectionId) || pin.connectionId === usedConfig.id) &&
    pin.workspaceId === usedConfig.workspaceId
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
    // Pins are persisted lazily, when the connection they belong to is saved
    // (ConnectionButton.save). A pin made while the connection was still
    // unsaved has no connection id yet: it is stamped with the id the
    // connection has now (see saveConnection). Until the connection has an
    // id there is nothing to save.
    async maybeSavePins(context) {
      const { usedConfig } = context.rootState
      if (!usedConfig?.id) return
      const unsavedPins = context.state.pins.filter((p) => !p.id && belongsToSession(p, usedConfig))
      if (!unsavedPins.length) return

      const saved: TransportPinnedEntity[] = await Vue.prototype.$util.send('appdb/pins/save', {
        // `entity` is attached by the orderedPins getter, it isn't part of the pin
        obj: unsavedPins.map((p) => ({
          ..._.omit(p, 'entity'),
          id: null,
          connectionId: usedConfig.id,
          workspaceId: usedConfig.workspaceId,
        }))
      })
      // the saved pins take the place of the unsaved ones, so removing one later removes its row
      context.commit('set', context.state.pins.map((p) => {
        const index = unsavedPins.indexOf(p)
        return index === -1 ? p : saved[index]
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
