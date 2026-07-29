
import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderFetchModule } from "@/store/modules/data/tree/FolderFetchModule";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";
import { SidebarModule } from "@/store/modules/data/tree/SidebarModule";
import _ from "lodash";

type State = DataState<IConnectionFolder>;

export const CloudConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: {
    ...mutationsFor<IConnectionFolder>({}, { field: 'name', direction: 'asc'}),
    ...accessGrantMutations(),
  },
  modules: {
    nodes: FolderNodeModule,
    sidebar: SidebarModule,
    folders: FolderFetchModule,
  },
  actions: actionsFor<IConnectionFolder>('connectionFolders', {
    ...cloudAccessGrantActions('connectionFolders'),
    async poll() {
      // empty on purpose
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
    async initialize() {
      // noop
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
          params: { parentId: unfetchedIds },
        });
      } finally {
        context.commit(
          'folders/fetchingIds',
          _.difference(context.state.folders.fetchingIds, unfetchedIds)
        );
      }
    },
  }),
}
