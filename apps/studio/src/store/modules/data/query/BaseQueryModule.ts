import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { upsert } from "../StoreHelpers";
import { ClientError } from '@/store/modules/data/StoreHelpers'

export interface QueryModuleState {
  queryFolders: IQueryFolder[]
  savedQueries: ISavedQuery[]
  loading: boolean
  error: ClientError
}

export const StateAndMutations = {
  state: {
    queryFolders: [],
    savedQueries: [],
    loading: false,
    error: null,
  },
  
  mutations: {
    loading(state, loading: boolean) {
      state.loading = loading
    },
    error(state, error: Error | null) {
      state.error = error
    },
    replace(state, list: ISavedQuery[]) {
      list.forEach((item) => {
        upsert(state.savedQueries, item)
      })
      state.savedQueries = list
    },
    add(state: QueryModuleState, item: ISavedQuery) {
      upsert(state.savedQueries, item)
    },
    remove(state, item: ISavedQuery) {
      state.savedQueries = _.without(state.savedQueries, item)
    },
    upsert(state, item: ISavedQuery) {
      upsert(state.savedQueries, item)
    }
  },
  
}

