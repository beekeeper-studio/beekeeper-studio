import { DataState, mutationsFor, DataStore, actionsFor } from "../DataModuleBase";
import _ from 'lodash'
import ISavedQuery from "@/common/interfaces/ISavedQuery";


type State = DataState<ISavedQuery>

export const CloudQueryModule: DataStore<ISavedQuery, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined
  },
  mutations: mutationsFor<ISavedQuery>({
    // more mutations go here
    savedQueryFilter(state: State, str: string) {
      state.filter = str;
    }
  }, { field: 'title', direction: 'asc'}),
  actions: actionsFor<ISavedQuery>('queries', {
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
