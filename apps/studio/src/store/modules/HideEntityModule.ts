import { TransportHiddenEntity, TransportHiddenSchema, matches, matchesSchema } from "@/common/transport/TransportHidden";
import { DatabaseEntity } from "@/lib/db/models";
import { IConnection } from "@/common/interfaces/IConnection";
import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from '../index'
import Vue from 'vue';

interface State {
  entities: TransportHiddenEntity[];
  schemas: TransportHiddenSchema[];
}

// A hidden entity or schema belongs to the session if it carries its
// connection and workspace, or was hidden while the connection was still
// unsaved and so has no connection id
function belongsToSession(item: TransportHiddenEntity | TransportHiddenSchema, usedConfig: IConnection): boolean {
  return (_.isNil(item.connectionId) || item.connectionId === usedConfig.id) &&
    item.workspaceId === usedConfig.workspaceId
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

        context.commit('set', { entities, schemas })
      }
    },
    async unload(context) {
      context.commit('set', { entities: [], schemas: [] })
    },
    // Hidden entities and schemas are persisted lazily, when the connection
    // they belong to is saved (ConnectionButton.save). One hidden while the
    // connection was still unsaved has no connection id yet: it is stamped
    // with the id the connection has now (see saveConnection). Until the
    // connection has an id there is nothing to save.
    async maybeSave(context) {
      const { usedConfig } = context.rootState
      if (!usedConfig?.id) return
      const unsavedEntities = context.state.entities.filter((e) => !e.id && belongsToSession(e, usedConfig))
      const unsavedSchemas = context.state.schemas.filter((s) => !s.id && belongsToSession(s, usedConfig))
      if (!unsavedEntities.length && !unsavedSchemas.length) return

      const stamp = <T>(u: T): T => ({ ...u, id: null, connectionId: usedConfig.id, workspaceId: usedConfig.workspaceId })
      const [savedEntities, savedSchemas]: [TransportHiddenEntity[], TransportHiddenSchema[]] = await Promise.all([
        unsavedEntities.length
          ? Vue.prototype.$util.send('appdb/hiddenEntity/save', { obj: unsavedEntities.map(stamp) })
          : [],
        unsavedSchemas.length
          ? Vue.prototype.$util.send('appdb/hiddenSchema/save', { obj: unsavedSchemas.map(stamp) })
          : [],
      ])
      // the saved rows take the place of the unsaved ones, so unhiding later removes the row
      context.commit('set', {
        entities: context.state.entities.map((e) => {
          const index = unsavedEntities.indexOf(e)
          return index === -1 ? e : savedEntities[index]
        }),
        schemas: context.state.schemas.map((s) => {
          const index = unsavedSchemas.indexOf(s)
          return index === -1 ? s : savedSchemas[index]
        }),
      })
    },
    async addEntity(context, item: DatabaseEntity) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.entities.find((e) => matches(e, item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const entity = await Vue.prototype.$util.send('appdb/hiddenEntity/new', {
          init: { table: item, db: database, saved: usedConfig}
        })
        if(usedConfig.id) await Vue.prototype.$util.send('appdb/hiddenEntity/save', { obj: entity })
        context.commit('addEntity', entity)
      }
    },
    async addSchema(context, item: string) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.schemas.find((s) => matchesSchema(s, item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const schema = await Vue.prototype.$util.send('appdb/hiddenSchema/new', {
          init: { name: item, db: database, saved: usedConfig}
        })
        if(usedConfig.id) await Vue.prototype.$util.send('appdb/hiddenSchema/save', { obj: schema });
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
