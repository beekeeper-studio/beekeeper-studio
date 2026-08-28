import _ from 'lodash'
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutateActions, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantActions, accessGrantMutations } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderableState, folderableActions } from "@/store/modules/data/tree/folderableStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IConnectionFolder> & FolderableState<IConnectionFolder>

export const UtilConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc' }),
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...utilActionsFor<IConnectionFolder>('connectionFolder', {}, { order: { name: 'ASC' } }),
    ...accessGrantActions('connectionFolders'),
    ...mutateActions<IConnectionFolder>(),
    ...treeActions<IConnectionFolder>({ plural: 'parentIds', singular: 'parentId' }),
    ...folderableActions<IConnectionFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async initialize() {
      // noop
    },
  }
}
