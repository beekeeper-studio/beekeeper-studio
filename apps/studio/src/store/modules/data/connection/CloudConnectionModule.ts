import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";

type State = DataState<ICloudSavedConnection>

export const CloudConnectionModule: DataStore<ICloudSavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    filter: undefined
  },
  mutations: mutationsFor<ICloudSavedConnection>({
    connectionFilter(state: State, str: string) {
      state.filter = str;
    }
  }, { field: 'name', direction: 'asc'}),
  actions: actionsFor<ICloudSavedConnection>('connections', {
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
