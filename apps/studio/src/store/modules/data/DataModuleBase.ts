import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { HasId } from "@/common/interfaces/IGeneric";

import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { havingCli, safely, safelyDo, upsert } from "./StoreHelpers";
import { ClientError } from '@/store/modules/data/StoreHelpers'
import { ActionContext, ActionTree, Module, MutationTree } from "vuex";
import { State as RootState } from '../../index'
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import Vue from "vue";
import { Transport } from "@/common/transport";

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
  filter?: string
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

interface SortSpec {
  field: string
  direction: 'asc' | 'desc'
}

const buildBasicMutations = <T extends HasId>(sortBy?: SortSpec) => ({
  loading(state, loading: boolean) {
    state.loading = loading
  },
  error(state, error: Error | null) {
    state.error = error
  },
  pollError(state, error: Error | null) {
    state.pollError = error
  },
  set(state, items: T[] | T) {
    items = _.isArray(items) ? items : [items];
    const sorted = sortBy ? _.sortBy(items, sortBy.field) : items;
    state.items = sortBy?.direction === 'desc' ? sorted.reverse() : sorted;
  },
  upsert(state, items: T[] | T) {
    const stateItems = [...state.items]
    const list = _.isArray(items) ? items : [items]
    list.forEach((item) => {
      upsert(stateItems, item)
    })
    const sorted = sortBy ? _.sortBy(stateItems, sortBy.field) : stateItems
    state.items = sortBy?.direction === 'desc' ? sorted.reverse() : sorted
  },
  replace(state, items: T[]) {
    const itemIds = items.map((i) => i.id)
    const stateIds = state.items.map((i) => i.id)

    const toUpdate = items.filter((i) => stateIds.includes(i.id))
    const toInsert = items.filter((i) => !stateIds.includes(i.id))

    const stateItems = _.reject(state.items, (item) => !itemIds.includes(item.id))
    const upsertable = [...toUpdate, ...toInsert]
    upsertable.forEach((i) => upsert(stateItems, i))
    const sorted = sortBy ? _.sortBy(stateItems, sortBy.field) : stateItems
    state.items = sortBy?.direction === 'desc' ? sorted.reverse() : sorted
  },
  remove(state, item: T | T[] | number) {

    const list = _.isArray(item) ? item : [item]
    const ids = list.map((item) => {
      return _.isNumber(item) ? item : item.id
    })
    state.items = _.reject(state.items, (item) => ids.includes(item.id))
  },
})

export function mutationsFor<T extends HasId>(obj: any = {}, sortBy?: SortSpec) {
  return {
    ...buildBasicMutations<T>(sortBy),
    ...obj
  }
}

export function utilActionsFor<T extends Transport>(type: string, other: any = {}, loadOptions: any = {}, findOneSelects: any = {}) {
  return {
    async load(context) {
      context.commit("error", null);
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send(`appdb/${type}/find`, { options: loadOptions });
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          context.commit('upsert', items);
        }
      })
    },
    async poll() {
      // do nothing, locally we don't need to poll.
      // nothing else can change anything.
    },

    async clearError(context) {
      context.commit('error', null)
    },

    async clone(_context, item: T) {
      const result: T = _.cloneDeep(item)
      result['id'] = null
      result['createdAt'] = null
      return result
    },

    async save(context, item: T) {
      const updated = await Vue.prototype.$util.send(`appdb/${type}/save`, { obj: item });
      context.commit('upsert', updated);
      return updated.id;
    },

    async remove(context, item: T) {
      await Vue.prototype.$util.send(`appdb/${type}/remove`, { obj: item });
      context.commit('remove', item)
    },

    async reload(context, id: number) {
      const item = await Vue.prototype.$util.send(`appdb/${type}/findOneBy`, { options: { id } })
      if (item) {
        context.commit('upsert', item)
        return item.id
      } else {
        context.commit('remove', id)
        return null
      }
    },
    async findOne(_context, id: number) {
      const item = await Vue.prototype.$util.send(`appdb/${type}/findOne`, {
        options: {
          where: {
            id
          },
          select: findOneSelects
        }
      });
      return item;
    },
    ...other
  }
}

export function actionsFor<T extends HasId>(scope: string, obj: any) {
  return {
    async load(context) {
      context.commit("error", null)
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
    async save(context, item: T): Promise<T> {
      return await havingCli(context, async (cli) => {
        const updated = await cli[scope].upsert(item)
        context.commit('upsert', updated)
        return updated.id
      })
    },
    async remove(context, item: T) {
      await havingCli(context, async (cli) => {
        await cli[scope].delete(item)
        context.commit('remove', item)
      })
    },

    async clearError(context) {
      context.commit('error', null)
    },
    async reload(context, id: number): Promise<T | null> {
      return await havingCli(context, async (cli) => {
        try {
          const updated = await cli[scope].get(id)
          context.commit('upsert', updated)
          return updated.id
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
    async findOne(context, id: number): Promise<T> {
      let item;
      await havingCli(context, async (cli) => {
        item = await cli[scope].get(id);
      });
      return item;
    },
    ...obj
  }
}


