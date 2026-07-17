
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";

type State = DataState<IConnectionFolder>

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null
  },
  mutations: mutationsFor<IConnectionFolder>({ ...accessGrantMutations() }, { field: 'name', direction: 'asc'}),
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
    async moveToFolder(context, { connection, folder }) {
      const updated = { ...connection, connectionFolderId: folder?.id ?? null }
      await context.dispatch('data/connections/save', updated, { root: true })
    }
  })
}
