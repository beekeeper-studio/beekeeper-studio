import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { HasId } from "@/common/interfaces/IGeneric";

import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { upsert } from "./StoreHelpers";
import { ClientError } from '@/store/modules/data/StoreHelpers'

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



export interface DataStoreMutations<T> {
  loading(state: DataState<T>, loading: boolean): void
  error(state: DataState<T>, error: ClientError): void
  upsert(state: DataState<T>, item: T | T[]): void
  remove(state: DataState<T>, item: T | T[]): void
}
export interface DataStore<T> {
  state: DataState<T>
  mutations: DataStoreMutations<T>
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
    const toDelete = state.items.filter((i) => !itemIds.includes(i.id))

    const stateItems = _.without([...state.items], toDelete)
    const upsertable = [...toUpdate, ...toInsert]
    upsertable.forEach((i) => upsert(stateItems, i))
    state.items = stateItems
  },
  remove(state, item: T | T[]) {
    const list = _.isArray(item) ? item : [item]
    list.forEach((item) => {
      state.items = _.without(state.items, item)
    })
  },
})

export function mutationsFor<T>(obj: any) {
  return {
    ...buildBasicMutations<T>(),
    ...obj
  }
}


