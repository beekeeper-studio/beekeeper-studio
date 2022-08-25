import { DatabaseEntity } from "@/lib/db/models";
import { BaseBKEntity } from "../../common/appdb/models/BaseBKEntity";
import { State as RootState } from '../index'
import { Module } from "vuex";

interface ModuleState<Entity extends BaseBKEntity> {
  entities: Entity[],
}

type ExtendedBKEntity = typeof BaseBKEntity & { new (): BaseBKEntity }

export function useBaseEntityModule<Entity extends BaseBKEntity>(
  entityClass: ExtendedBKEntity
): Module<ModuleState<Entity>, RootState> {
  return {
    namespaced: true,
    state: {
      entities: [],
    },
    getters: {
      entitiesOfCurrentDatabase(state, _, { tables, routines, database }) {
        const dbEntities = [...tables, ...routines]
        return state.entities
          .filter(({ databaseName }) => databaseName === database)
          .map((bkEntity) => ({
            ...bkEntity,
            entity: dbEntities.find((dbEntity) => bkEntity.matches(dbEntity)),
          }))
      },
      databaseEntities(_, getters) {
        return getters.entitiesOfCurrentDatabase.map(({ entity }) => entity) as DatabaseEntity[]
      },
    },
    mutations: {
      set(state, entities: Entity[]) {
        state.entities = entities
      },
      add(state, entity: Entity) {
        state.entities.push(entity)
      },
      remove(state, entity: Entity) {
        state.entities = _.without(state.entities, entity)
      }
    },
    actions: {
      async loadEntities(context) {
        const { usedConfig } = context.rootState
        if (usedConfig && usedConfig.id) {
          // await usedConfig.reload()
          const entities = await entityClass.find({
            where: {
              connectionId: usedConfig.id,
              workspaceId: usedConfig.workspaceId,
            }
          })
          context.commit('set', entities)
        }
      },
      async unloadEntities(context) {
        context.commit('set', [])
      },
      async maybeSaveEntities(context) {
        const { usedConfig } = context.rootState
        const unsavedEntities = context.state.entities.filter((e)=> !e.hasId())
        await Promise.all(unsavedEntities.map((e) => {
          if(e.connectionId === usedConfig.id && e.workspaceId === usedConfig.id)
            e.save()
        }))
      },
      async add(context, item: DatabaseEntity) {
        const { database, usedConfig } = context.rootState
        const existing = context.state.entities.some((e) => e.matches(item, database || undefined))
        if (existing) return

        if (database && usedConfig) {
          const newEntity = new entityClass(item, database, usedConfig)
          if(usedConfig.id) await newEntity.save()
          context.commit('add', newEntity)
        }
      },
      async remove(context, item: DatabaseEntity) {
        const { database } = context.rootState
        const entity = context.state.entities.find((e) => e.matches(item, database || undefined))
        if (entity) {
          if (entity.id) await entity.remove()
          context.commit('remove', entity)
        }
      }
    }
  }
  
}
