import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";
import { upsert } from "../StoreHelpers";


export interface QueryModuleState {
  queryFolders: IQueryFolder[]
  savedQueries: ISavedQuery[]
}


export const StateAndMutations = {
  state: {
    queryFolders: [],
    savedQueries: []
  },
  
  mutations: {
    replace(state, list: ISavedQuery[]) {
      state.savedQueries = list
    },
    add(state: QueryModuleState, item: ISavedQuery) {
      upsert(state.savedQueries, item)
    },
    remove(state, item: ISavedQuery) {
      state.savedQueries = _.without(state.savedQueries, item)
    }
  },
  
}

