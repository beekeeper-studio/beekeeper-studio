import { IConnection } from "@/common/interfaces/IConnection";
import { DataState, DataStore, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";

type State = DataState<IConnection>

export const UtilConnectionModule: DataStore<IConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined
  },
  mutations: mutationsFor<IConnection>({
    connectionFilter(state: DataState<IConnection>, str: string) {
      state.filter = str;
    }
  }),
  actions: utilActionsFor<IConnection>('saved', {
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
