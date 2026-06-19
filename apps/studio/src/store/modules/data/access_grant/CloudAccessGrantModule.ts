import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

type State = DataState<IAccessGrant>

export const CloudAccessGrantModule: DataStore<IAccessGrant, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IAccessGrant>({}, { field: 'id', direction: 'asc' }),
  actions: actionsFor<IAccessGrant>('accessGrants', {
    async load(context, options) {
      if (options?.initialLoad) {
        return;
      }
      return await actionsFor<IAccessGrant>('accessGrants', {})['load'](context, options);
    },
    async poll() {
      // empty on purpose
    },
  }),
}
