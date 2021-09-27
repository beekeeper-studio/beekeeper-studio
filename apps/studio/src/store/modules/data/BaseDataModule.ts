import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import _ from "lodash";


export interface DataModuleState {
  queryFolders: IQueryFolder[]
  savedQueries: ISavedQuery[]
}


export const StateAndMutations = {
  state: {
    queryFolders: [],
    savedQueries: []
  },

  mutations: {
    queriesReplace(state, list: ISavedQuery[]) {
      state.savedQueries = list
    },
    queriesAdd(state, item: ISavedQuery) {
      state.savedQueries.unshift(item)
    },
    queriesRemove(state, item: ISavedQuery) {
      state.savedQueries = _.without(state.savedQueries, item)
    }
  },

}

