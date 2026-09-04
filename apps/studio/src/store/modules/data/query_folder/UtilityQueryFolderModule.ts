import _ from 'lodash'
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutateActions, mutationsFor, utilActionsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantActions, accessGrantMutations } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/treeStore";
import { FolderableState, folderableActions } from "@/store/modules/data/tree/folderableStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IQueryFolder> & FolderableState<IQueryFolder>

export const UtilQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state() {
    return {
      items: [],
      loading: false,
      error: null,
      pollError: null,
    }
  },
  mutations: {
    ...mutationsFor<IQueryFolder>({}, { field: 'name', direction: 'asc' }),
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...utilActionsFor<IQueryFolder>('queryFolder', {}, { order: { name: 'ASC' } }),
    ...accessGrantActions('queryFolders'),
    ...mutateActions<IQueryFolder>(),
    ...treeActions<IQueryFolder>({ plural: 'parentIds', singular: 'parentId' }),
    ...folderableActions<IQueryFolder>(),
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async initialize() {
      // noop
    },
  }
}
