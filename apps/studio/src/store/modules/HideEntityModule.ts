import { DatabaseEntity } from "@/lib/db/models";
import _ from "lodash";
import { Module } from "vuex";
import { HiddenEntity } from "../../common/appdb/models/HiddenEntity";
import { HiddenSchema } from "../../common/appdb/models/HiddenSchema";
import { State as RootState } from '../index'
interface State {
  entities: HiddenEntity[];
  schemas: HiddenSchema[];
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
        .map((e) => dbEntities.find((dbEntity) => e.matches(dbEntity)))
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
    addEntity(state, entity: HiddenEntity) {
      state.entities.push(entity)
    },
    addSchema(state, schema: HiddenSchema) {
      state.schemas.push(schema)
    },
    removeEntity(state, entity: HiddenEntity) {
      state.entities = _.without(state.entities, entity)
    },
    removeSchema(state, schema: HiddenSchema) {
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

        const entities = await HiddenEntity.find(findOptions)
        const schemas = await HiddenSchema.find(findOptions)

        context.commit('set', { entities, schemas })
      }
    },
    async unload(context) {
      context.commit('set', { entities: [], schemas: [] })
    },
    async maybeSave(context) {
      const { usedConfig } = context.rootState
      const unsavedEntities = context.state.entities.filter((e)=> !e.hasId())
      const unsavedSchemas = context.state.schemas.filter((s)=> !s.hasId())

      await Promise.all([...unsavedEntities, ...unsavedSchemas].map((u) => {
        if(u.connectionId === usedConfig.id && u.workspaceId === usedConfig.id)
          u.save()
      }))
    },
    async addEntity(context, item: DatabaseEntity) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.entities.find((e) => e.matches(item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const entity = new HiddenEntity(item, database, usedConfig)
        if(usedConfig.id) await entity.save()
        context.commit('addEntity', entity)
      }
    },
    async addSchema(context, item: string) {
      const { database, usedConfig } = context.rootState
      const existing = context.state.schemas.find((s) => s.matches(item, database || undefined))
      if (existing) return

      if (database && usedConfig) {
        const schema = new HiddenSchema(item, database, usedConfig)
        if(usedConfig.id) await schema.save()
        context.commit('addSchema', schema)
      }
    },
    async removeEntity(context, item: DatabaseEntity) {
      const { database } = context.rootState
      const existing = context.state.entities.find((e) => e.matches(item, database || undefined))
      if (existing) {
        if (existing.id) await existing.remove()
        context.commit('removeEntity', existing)
      }
    },
    async removeSchema(context, item: string) {
      const { database } = context.rootState
      const existing = context.state.schemas.find((s) => s.matches(item, database || undefined))
      if (existing) {
        if (existing.id) await existing.remove()
        context.commit('removeSchema', existing)
      }
    },
  }
  
}
