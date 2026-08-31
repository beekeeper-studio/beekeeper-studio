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
import { ListOptions } from "@/lib/cloud/controllers/GenericController";

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
  pendingSaveIds?: number[]
  searching?: boolean
}



/**
 * Payload for full or partial replacement operations.
 * - An array replaces all existing items.
 * - `replaceIf` decides what a missing item means: an existing item absent from
 *   `items` is only removed when the predicate accepts it.
 */
export type ReplacePayload<T> =
  | T[]
  | { items: T[]; replaceIf?: (item: T) => boolean }

export type LoadOptions<T> = Partial<ListOptions> & {
  replaceIf?: (item: T) => boolean
  onError?: (error: ClientError) => void
}

export type MutatePayload<T> =
  | { type: 'set'; data: T | T[] }
  | { type: 'upsert'; data: T | T[] }
  | { type: 'replace'; data: ReplacePayload<T> }
  | { type: 'remove'; data: T | T[] | number }

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
  searching(state, searching: boolean) {
    state.searching = searching
  },
  addPendingSave(state, id: number) {
    if (!state.pendingSaveIds) state.pendingSaveIds = []
    if (!state.pendingSaveIds.includes(id)) {
      state.pendingSaveIds.push(id)
    }
  },
  removePendingSave(state, id: number) {
    if (state.pendingSaveIds) {
      state.pendingSaveIds = state.pendingSaveIds.filter((i) => i !== id)
    }
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
  replace(state, payload: ReplacePayload<T>) {
    const items = _.isArray(payload) ? payload : payload.items
    const replaceIf = _.isArray(payload) ? undefined : payload.replaceIf

    const pendingIds = state.pendingSaveIds || []
    const itemIds = items.map((i) => i.id)
    const stateIds = state.items.map((i) => i.id)

    // Don't update items that have pending saves - keep local optimistic version
    const toUpdate = items.filter((i) => stateIds.includes(i.id) && !pendingIds.includes(i.id))
    const toInsert = items.filter((i) => !stateIds.includes(i.id))
    const toRemove = state.items
      .filter((i) => !itemIds.includes(i.id))
      .filter((i) => !replaceIf || replaceIf(i))
      .map((i) => i.id)

    // Don't remove items that have pending saves
    const stateItems = _.reject(state.items, (item) =>
      toRemove.includes(item.id) && !pendingIds.includes(item.id)
    )
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

export function mutateActions<T>() {
  return {
    async mutate(context, options: MutatePayload<T>) {
      context.commit(options.type, options.data);
      await context.dispatch("afterMutate", options);
    },
    async afterMutate() {
      // modules that derive state from items override this
    },
  }
}

export function utilActionsFor<T extends Transport>(type: string, other: any = {}, loadOptions: any = {}, findOneSelects: any = {}) {
  return {
    async initialize(context) {
      await context.dispatch('load');
    },
    async load(context, options: LoadOptions<T> = {}) {
      context.commit("error", null);
      await safely(context, async () => {
        const items = await Vue.prototype.$util.send(`appdb/${type}/find`, { options: loadOptions });
        if (context.rootState.workspaceId === LocalWorkspace.id) {
          await context.dispatch('mutate', { type: 'upsert', data: items });
        }
      }, options.onError)
    },
    async search() {
      // no-op, only the cloud module supports server-side search
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
      await context.dispatch('mutate', { type: 'upsert', data: updated });
      return updated.id;
    },

    async saveMany(context, items: T[]) {
      // Optimistic commit so any re-renders during the async saves see correct state
      await context.dispatch('mutate', { type: 'upsert', data: items });
      const saved = await Promise.all(
        items.map(item => Vue.prototype.$util.send(`appdb/${type}/save`, { obj: item }))
      );
      await context.dispatch('mutate', { type: 'upsert', data: saved });
    },

    async remove(context, item: T) {
      await Vue.prototype.$util.send(`appdb/${type}/remove`, { obj: item });
      await context.dispatch('mutate', { type: 'remove', data: item })
    },

    async reload(context, id: number) {
      const item = await Vue.prototype.$util.send(`appdb/${type}/findOneBy`, { options: { id } })
      if (item) {
        await context.dispatch('mutate', { type: 'upsert', data: item })
        return item.id
      } else {
        await context.dispatch('mutate', { type: 'remove', data: id })
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
    ...mutateActions<T>(),
    ...other
  }
}

export function actionsFor<T extends HasId>(scope: string, obj: any) {
  return {
    async initialize(context) {
      await context.dispatch("load");
    },
    async load(context, options: LoadOptions<T> = {}) {
      context.commit("error", null)
      await safelyDo(context, async (cli) => {
        const items: any[] = await cli[scope].list(undefined, options)
        // this is to account for when the store module changes
        const rightItems = items.filter((i) => i.workspaceId === context.rootState.workspaceId)
        if (rightItems.length === items.length) {
          await context.dispatch('mutate', {
            type: 'replace',
            data: { items: rightItems, replaceIf: options.replaceIf },
          })
        }
      }, options.onError)
    },
    async search(context, q: string) {
      if (!q) {
        return
      }
      context.commit('searching', true)
      try {
        await safelyDo(context, async (cli) => {
          const items = await cli[scope].search(q)
          await context.dispatch('mutate', { type: 'upsert', data: items })
        })
      } finally {
        context.commit('searching', false)
      }
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
            await context.dispatch('mutate', { type: 'replace', data: rightItems })
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
        await context.dispatch('mutate', { type: 'upsert', data: updated })
        return updated.id
      })
    },
    async remove(context, item: T) {
      await havingCli(context, async (cli) => {
        await cli[scope].delete(item)
        await context.dispatch('mutate', { type: 'remove', data: item })
      })
    },

    async clearError(context) {
      context.commit('error', null)
    },
    async reload(context, id: number): Promise<T | null> {
      return await havingCli(context, async (cli) => {
        try {
          const updated = await cli[scope].get(id)
          await context.dispatch('mutate', { type: 'upsert', data: updated })
          return updated.id
        } catch (ex) {
          if (ex.status && ex.status === 404) {
            await context.dispatch('mutate', { type: 'remove', data: id })
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
    ...mutateActions<T>(),
    ...obj
  }
}


