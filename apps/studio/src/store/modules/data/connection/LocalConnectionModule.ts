import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { DataState, DataStore, localActionsFor, mutationsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";

type State = DataState<SavedConnection>

export const LocalConnectionModule: DataStore<SavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined
  },
  mutations: mutationsFor<SavedConnection>({
    connectionFilter(state: DataState<SavedConnection>, str: string) {
      state.filter = str;
    }
  }),
  actions: localActionsFor<SavedConnection>(SavedConnection, {
    setConnectionFilter: _.debounce(function (context, filter) {
      context.commit('connectionFilter', filter);
    }, 500)
  }),
  getters: {
    filteredConnections(state) {
      if (!state.filter) {
        return state.items;
      }

      const startsWithFilter = _(state.items)
        .filter((item) => _.startsWith(item.name.toLowerCase(), state.filter))
        .value();

      const containsFilter = _(state.items)
        .difference(startsWithFilter)
        .filter((item) => item.name.toLowerCase().includes(state.filter.toLowerCase()))
        .value();

      return _.concat(startsWithFilter, containsFilter);
    }
  }

}
