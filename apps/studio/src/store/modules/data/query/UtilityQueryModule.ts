import { TransportFavoriteQuery } from '@/common/transport';
import _ from 'lodash'
import { mutationsFor, DataState, DataStore, utilActionsFor } from '../DataModuleBase'

export const UtilQueryModule: DataStore<TransportFavoriteQuery, DataState<TransportFavoriteQuery>> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined // maybe this can be more advanced? date filter?
  },
  mutations: mutationsFor<TransportFavoriteQuery>({
    // more mutations go here
    savedQueryFilter(state: DataState<TransportFavoriteQuery>, str: string) {
      state.filter = str;
    }
  }, { field: 'title', direction : 'asc'}),
  actions: utilActionsFor<TransportFavoriteQuery>('query', {
    setSavedQueryFilter: _.debounce(function (context, filter) {
      context.commit('savedQueryFilter', filter);
    }, 500)
  }, {}, { text: true, title: true, database: true, excerpt: true, id: true }),
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
