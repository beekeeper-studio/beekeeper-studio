import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule, treeActions } from "@/store/modules/data/tree/TreeModule";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";

type State = DataState<IQueryFolder>;

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IQueryFolder>({
    ...accessGrantMutations(),
  }, { field: 'name', direction: 'asc'}),
  modules: {
    nodes: FolderNodeModule,
    folders: FolderFetchModule,
  },
  actions: {
    ...actionsFor<IQueryFolder>('queryFolders', {}),
    ...cloudAccessGrantActions('queryFolders'),
    ...treeActions<IQueryFolder>('queryFolders', 'parentIds'),
    /**
     * Overrides the shared reset-and-reload: the default folders are the tree's
     * roots, so they have no parent to be fetched under. They also have to land
     * before their children — a node only links to a parent already in the tree.
     **/
    async refresh(context, parentIds: number[]) {
      context.commit('folders/reset');
      await context.dispatch('load', { params: { default: true } });

      if (parentIds.length === 0) {
        return;
      }

      await context.dispatch('loadMore', { params: { parentIds } });
      context.commit('folders/fetchedIds', parentIds);
    },
    async initialize() {
      // noop
    },
    async poll() {
      // empty on purpose
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  },
}
