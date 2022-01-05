import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { HasId } from "@/common/interfaces/IGeneric";

import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { havingCli, safely, safelyDo, upsert } from "./StoreHelpers";
import { ClientError } from '@/store/modules/data/StoreHelpers'
import { ActionContext, ActionTree, Module, MutationTree } from "vuex";
import { State as RootState } from '../../index'
import { ApplicationEntity } from "@/common/appdb/models/application_entity";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";

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
  pollError: ClientError
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
  pollError(state, error: Error | null) {
    state.pollError = error
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
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          context.commit('upsert', items)
        }
      })
    },

    async poll() {
      // do nothing, locally we don't need to poll.
      // nothing else can change anything.
    },

    async clone(_context, item: T) {
      const result = new cls()
      cls.merge(result, item)
      result.id = null
      result.createdAt = new Date()
      return result
    },

    async create(context, item: T) {
      const q = new cls()
      cls.merge(q, item)
      await q.save()
      context.commit('upsert', q)
      return q.id
    },

    async update(context, item: T) {
      const existing = context.state.items.find((i) => i.id === item.id)
      if (!existing) throw new Error("Could not find this item")
      cls.merge(existing, item)
      await existing.save()
      return existing.id
    },

    async save(context, item: T) {
      if (item.id) {
        return await context.dispatch('update', item)
      } else {
        return await context.dispatch('create', item)
      }
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
        const items: any[] = await cli[scope].list()
        // this is to account for when the store module changes
        const rightItems = items.filter((i) => i.workspaceId === context.rootState.workspaceId)
        if (rightItems.length === items.length) {
          context.commit('replace', rightItems)
        }
      })
    },
    // TODO THIS ISNT WORKING
    async poll(context) {
      // TODO (matthew): This should only fetch items since last update.
      await havingCli(context, async (cli) => {
        try {
          // we just re-fetch everything. It's pretty heavy handed
          // we don't call load because that updates `loading`.

          const items = await cli[scope].list()
          // this is to account for when the store module changes
          const rightItems = items.filter((item) => item.workspaceId === context.rootState.workspaceId)
          if (rightItems.length === items.length) {
            context.commit('replace', rightItems)
          }
          context.commit('pollError', null)
        } catch (ex) {
          context.commit('pollError', ex)
        }
      })
    },
    async save(context, query: T): Promise<T> {
      return await havingCli(context, async (cli) => {
        const updated = await cli[scope].upsert(query)
        context.commit('upsert', updated)
        return updated.id
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


