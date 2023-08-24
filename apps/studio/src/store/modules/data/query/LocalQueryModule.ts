import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import _ from 'lodash'
import { mutationsFor, DataState, DataStore, localActionsFor } from '../DataModuleBase'

export const LocalQueryModule: DataStore<FavoriteQuery, DataState<FavoriteQuery>> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<FavoriteQuery>({
    // more mutations go here
  }, { field: 'title', direction : 'asc'}),
  actions: localActionsFor<FavoriteQuery>(FavoriteQuery, {})
}
