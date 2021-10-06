import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
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



const buildBasicMutations = <T>() => ({
  loading(state, loading: boolean) {
    state.loading = loading
  },
  error(state, error: Error | null) {
    state.error = error
  },
  upsert(state, items: T[] | T) {
    const list = _.isArray(items) ? items : [items]
    list.forEach((item) => {
      upsert(state.items, item)
    })
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


