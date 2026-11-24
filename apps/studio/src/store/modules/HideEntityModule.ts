import { TransportHiddenEntity, TransportHiddenSchema, matches, matchesSchema } from "@/common/transport/TransportHidden";
import { DatabaseEntity } from "@/lib/db/models";
import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from '../index'
import Vue from 'vue';

interface State {
  entities: TransportHiddenEntity[];
  schemas: TransportHiddenSchema[];
}

export const HideEntityModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    entities: [],
    schemas: [],
  }),
  getters: {
    databaseEntities(state, _, { tables, routines, database }) {
      const dbEntities = [...tables, ...routines] as DatabaseEntity[]
      return state.entities
        .filter((e) => e.databaseName === database)
        .map((e) => dbEntities.find((dbEntity) => matches(e, dbEntity)))
        .filter((e): e is DatabaseEntity => !!e)
    },
    databaseSchemas(state, _, { database }) {
      return state.schemas
        .filter((s) => s.databaseName === database)
        .map((s) => s.name)
    },
    totalEntities(_, getters, { tables, routines }) {
      const dbEntities = [...tables, ...routines]
      const entitiesInSchemas = dbEntities
        .filter((entity) => getters.databaseSchemas.includes(entity.schema))
      return getters.databaseEntities.length + entitiesInSchemas.length
    },
  },
  mutations: {
    set(state, { entities, schemas }: State) {
      state.entities = entities
      state.schemas = schemas
    },
    addEntity(state, entity: TransportHiddenEntity) {
      state.entities.push(entity)
    },
    addSchema(state, schema: TransportHiddenSchema) {
      state.schemas.push(schema)
    },
    removeEntity(state, entity: TransportHiddenEntity) {
      state.entities = _.without(state.entities, entity)
    },
    removeSchema(state, schema: TransportHiddenSchema) {
      state.schemas = _.without(state.schemas, schema)
    },
  },
  actions: {
    async load(context) {
      const { usedConfig } = context.rootState
      if (usedConfig && usedConfig.id) {
        // await usedConfig.reload()
        
        const findOptions = {
          where: {
            connectionId: usedConfig.id,
            workspaceId: usedConfig.workspaceId
          }
        }

        const entities = await Vue.prototype.$util.send('appdb/hiddenEntity/find', {
          options: findOptions
        });
        const schemas = await Vue.prototype.$util.send('appdb/hiddenSchema/find', {
          options: findOptions
        });

        context.commit('set', { entities: entities || [], schemas: schemas || [] })
      }
    },
    async unload(context) {
      context.commit('set', { entities: [], schemas: [] })
    },
    async maybeSave(context) {
      const { usedConfig } = context.rootState
      if (!usedConfig || !usedConfig.id) return

      const saveItem = async <T extends TransportHiddenEntity | TransportHiddenSchema>(
        item: T,
        scope: 'hiddenEntity' | 'hiddenSchema'
      ): Promise<T> => {
        if (!item.id && item.connectionId === usedConfig.id && item.workspaceId === usedConfig.workspaceId) {
          return await Vue.prototype.$util.send(`appdb/${scope}/save`, { obj: item })
        }
        return item
      }

      const [entities, schemas] = await Promise.all([
        Promise.all(context.state.entities.map((e) => saveItem(e, 'hiddenEntity'))),
        Promise.all(context.state.schemas.map((s) => saveItem(s, 'hiddenSchema'))),
      ])

      context.commit('set', { entities, schemas })
    },
    async addEntity(context, item: DatabaseEntity) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.entities.find((e) => matches(e, item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        let entity = await Vue.prototype.$util.send('appdb/hiddenEntity/new', {
          init: { table: item, db: database, saved: usedConfig}
        })
        if (usedConfig.id) {
          entity = await Vue.prototype.$util.send('appdb/hiddenEntity/save', { obj: entity })
        }
        context.commit('addEntity', entity)
      }
    },
    async addSchema(context, item: string) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.schemas.find((s) => matchesSchema(s, item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        let schema = await Vue.prototype.$util.send('appdb/hiddenSchema/new', {
          init: { name: item, db: database, saved: usedConfig}
        })
        if (usedConfig.id) {
          schema = await Vue.prototype.$util.send('appdb/hiddenSchema/save', { obj: schema });
        }
        context.commit('addSchema', schema)
      }
    },
    async removeEntity(context, item: DatabaseEntity) {
      const { database } = context.rootState
      const existing = context.state.entities.find((e) => matches(e, item, database || undefined))
      if (existing) {
        if (existing.id) await Vue.prototype.$util.send('appdb/hiddenEntity/remove', { obj: existing })
        context.commit('removeEntity', existing)
      }
    },
    async removeSchema(context, item: string) {
      const { database } = context.rootState
      const existing = context.state.schemas.find((s) => matchesSchema(s, item, database || undefined))
      if (existing) {
        if (existing.id) await Vue.prototype.$util.send('appdb/hiddenSchema/remove', { obj: existing })
        context.commit('removeSchema', existing)
      }
    },
  }
  
}
