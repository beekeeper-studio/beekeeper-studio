import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { HasId } from "@/common/interfaces/IGeneric";

import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { havingCli, safely, safelyDo, upsert } from "./StoreHelpers";
import { ClientError } from '@/store/modules/data/StoreHelpers'
import { ActionContext, ActionTree, Module, MutationTree } from "vuex";
import { State as RootState } from '../../index'
import { ApplicationEntity } from "@/common/appdb/models/application_entity";

export interface QueryModuleState {
  queryFolders: IQueryFolder[]
  savedQueries: ISavedQuery[]
  loading: boolean
  error: ClientError
}


export interface DataState<T> {
  items: T[]
  loading: boolean
  error: ClientError
}



export interface DataStoreMutations<T, X extends DataState<T>> extends MutationTree<X> {
  loading(state: X, loading: boolean): void
  error(state: X, error: ClientError): void
  upsert(state: X, item: T | T[]): void
  remove(state: X, item: T | T[]): void
}
// export interface DataStore<T> {
  //   state: DataState<T>
  //   mutations: DataStoreMutations<T>
  // }
  
  export interface DataStoreActions<T, X extends DataState<T>> extends ActionTree<X, RootState> {
    
    save(context: ActionContext<X, RootState>, item: T): Promise<T>
    load(context: ActionContext<X, RootState>): Promise<void>
    remove(context: ActionContext<X, RootState>, item: T): Promise<void>
    reload(context: ActionContext<X, RootState>, id: number): Promise<T | null>
    clone(context: ActionContext<X, RootState>, item: T): Promise<T>
}



export interface DataStore<T, X extends DataState<T>> extends Module<X, RootState> {
  state: X
  mutations: DataStoreMutations<T, X>
  actions: DataStoreActions<T, X>
}


const buildBasicMutations = <T extends HasId>() => ({
  loading(state, loading: boolean) {
    state.loading = loading
  },
  error(state, error: Error | null) {
    state.error = error
  },
  upsert(state, items: T[] | T) {
    const stateItems = [...state.items]
    const list = _.isArray(items) ? items : [items]
    list.forEach((item) => {
      upsert(stateItems, item)
    })
    state.items = stateItems
  },
  replace(state, items: T[]) {
    const itemIds = items.map((i) => i.id)
    const stateIds = state.items.map((i) => i.id)

    const toUpdate = items.filter((i) => stateIds.includes(i.id))
    const toInsert = items.filter((i) => !stateIds.includes(i.id))    

    const stateItems = _.reject(state.items, (item) => !itemIds.includes(item.id))
    const upsertable = [...toUpdate, ...toInsert]
    upsertable.forEach((i) => upsert(stateItems, i))
    state.items = stateItems
  },
  remove(state, item: T | T[] | number) {
    
    const list = _.isArray(item) ? item : [item]
    const ids = list.map((item) => {
      return _.isNumber(item) ? item : item.id
    })
    state.items = _.reject(state.items, (item) => ids.includes(item.id))
  },
})

export function mutationsFor<T extends HasId>(obj: any) {
  return {
    ...buildBasicMutations<T>(),
    ...obj
  }
}

export function localActionsFor<T extends ApplicationEntity>(cls: any, other: any) {
  return {
    async load(context) {
      await safely(context, async () => {
        const items = await cls.find()
        context.commit('upsert', items)
      })
    },
    async clone(_context, item: T) {
      const result = new cls()
      Object.assign(result, item)
      result.id = null
      result.createdAt = null
      return result
    },

    async save(context, item: T) {
      await item.save()
      context.commit('upsert', item)
      return item
    },

    async remove(context, item: T) {
      await item.remove()
      context.commit('remove', item)
    },

    async reload(context, id: number) {
      const item = cls.findOne(id)
      if (item) {
        context.commit('upsert', item)
        return item
      } else {
        context.commit('remove', id)
        return null
      }
    },
    ...other
  }
}

export function actionsFor<T extends HasId>(scope: string, obj: any) {
  return {
    async load(context) {
      await safelyDo(context, async (cli) => {
        const queries = await cli[scope].list()
        context.commit('replace', queries)
      })
    },
    async poll(context) {
      // TODO (matthew): This should only fetch items since last update.
      await havingCli(context, async (cli) => {
        const items = await cli[scope].list()
        context.commit('replace', items)
      })
    },
    async save(context, query: T): Promise<T> {
      return await havingCli(context, async (cli) => {
        const updated = await cli[scope].upsert(query)
        context.commit('upsert', updated)
        return updated
      })
    },
    async remove(context, query: T) {
      await havingCli(context, async (cli) => {
        await cli[scope].delete(query)
        context.commit('remove', query)
      })
    },
    async reload(context, id: number): Promise<T | null> {
      return await havingCli(context, async (cli) => {
        try {
          const updated = await cli[scope].get(id)
          context.commit('upsert', updated)
          return updated
        } catch (ex) {
          if (ex.status && ex.status === 404) {
            context.commit('remove', id)
          }
          return null
        }
      })
    },
    async clone(_context, item: T): Promise<T> {
      const result: T = _.cloneDeep(item)
      result['id'] = null
      result['createdAt'] = null
      return result
    },
    ...obj
  }
}


