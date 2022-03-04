import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import _ from 'lodash'
import { mutationsFor, DataState, DataStore, localActionsFor } from '../DataModuleBase'

interface State extends DataState<FavoriteQuery> {

}

export const LocalQueryModule: DataStore<FavoriteQuery, State> = {
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
