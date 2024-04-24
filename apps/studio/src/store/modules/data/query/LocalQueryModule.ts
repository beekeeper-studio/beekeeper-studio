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
    filter: undefined // maybe this can be more advanced? date filter?
  },
  mutations: mutationsFor<FavoriteQuery>({
    // more mutations go here
    savedQueryFilter(state: DataState<FavoriteQuery>, str: string) {
      state.filter = str;
    }
  }, { field: 'title', direction : 'asc'}),
  actions: localActionsFor<FavoriteQuery>(FavoriteQuery, {
    setSavedQueryFilter: _.debounce(function (context, filter) {
      context.commit('savedQueryFilter', filter);
    }, 500)
  }),
  getters: {
    filteredQueries(state) {
      if (!state.filter) {
        return state.items;
      }

      const startsWithFilter = _(state.items)
        .filter((item) => _.startsWith(item.title.toLowerCase(), state.filter))
        .value();

      const containsFilter = _(state.items)
        .difference(startsWithFilter)
        .filter((item) => item.title.toLowerCase().includes(state.filter.toLowerCase()))
        .value();

      return _.concat(startsWithFilter, containsFilter);
    }
  }
}
