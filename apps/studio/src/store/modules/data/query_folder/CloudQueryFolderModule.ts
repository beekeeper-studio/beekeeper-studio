import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule } from "@/store/modules/data/tree/FolderFetchModule";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";
import { SidebarModule } from "@/store/modules/data/tree/SidebarModule";
import _ from "lodash";

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
    sidebar: SidebarModule,
    folders: FolderFetchModule,
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    ...cloudAccessGrantActions('queryFolders'),
    async initialize() {
      // noop
    },
    async poll() {
      // empty on purpose
    },
    async ensureLoaded(context, parentIds: number[]) {
      const fetchedIds = context.state.folders.fetchedIds;
      const unfetchedIds = _.difference(parentIds, fetchedIds);
      if (unfetchedIds.length === 0) {
        return;
      }
      // marked before the fetch so overlapping calls don't refetch these
      context.commit('folders/fetchedIds', [
        ...fetchedIds,
        ...unfetchedIds,
      ]);
      context.commit('folders/fetchingIds', [
        ...context.state.folders.fetchingIds,
        ...unfetchedIds,
      ]);
      try {
        await context.dispatch('loadMore', {
          params: { parentIds: unfetchedIds },
        });
      } finally {
        context.commit(
          'folders/fetchingIds',
          _.difference(context.state.folders.fetchingIds, unfetchedIds)
        );
      }
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  })
}
