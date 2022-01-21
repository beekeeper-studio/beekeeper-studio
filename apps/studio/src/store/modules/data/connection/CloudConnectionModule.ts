import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import _ from "lodash";

interface State extends DataState<ICloudSavedConnection> {

}

export const CloudConnectionModule: DataStore<ICloudSavedConnection, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<ICloudSavedConnection>({}, { field: 'name', direction: 'asc'}),
  actions: actionsFor<ICloudSavedConnection>('connections', {})
}
