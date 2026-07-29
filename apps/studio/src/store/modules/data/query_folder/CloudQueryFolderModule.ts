import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";
import { SidebarModule } from "@/store/modules/data/tree/SidebarModule";
import _ from "lodash";

type State = DataState<IQueryFolder> & {
  /** Folders whose children have already been fetched. */
  fetchedIds: number[];
  /** The default folders are being fetched. */
  initializing: boolean;
  /** Folders whose children are being fetched right now. */
  fetchingIds: number[];
};

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    fetchedIds: [],
    initializing: false,
    fetchingIds: [],
  },
  mutations: mutationsFor<IQueryFolder>({
    fetchedIds(state: State, ids: number[]) {
      state.fetchedIds = ids;
    },
    initializing(state: State, initializing: boolean) {
      state.initializing = initializing;
    },
    fetchingIds(state: State, ids: number[]) {
      state.fetchingIds = ids;
    },
    ...accessGrantMutations(),
  }, { field: 'name', direction: 'asc'}),
  modules: {
    nodes: FolderNodeModule,
    sidebar: SidebarModule,
  },
  actions: actionsFor<IQueryFolder>('queryFolders', {
    ...cloudAccessGrantActions('queryFolders'),
    async initialize(context) {
      // Reset the state
      context.commit('sidebar/expandedIds', []);
      context.commit('initializing', true);
      try {
        await context.dispatch('load', { params: { default: true } });
      } finally {
        context.commit('initializing', false);
      }

      // Expand default folders (Personal and Team)
      const defaultIds = context.state.items.map((folder) => folder.id);
      context.commit('fetchedIds', defaultIds);
      context.commit('sidebar/expandedIds', defaultIds);
      // The queries of these folders come with the default fetch, which can
      // return none of them, so they can't mark themselves fetched.
      context.commit('data/queries/fetchedParentIds', defaultIds, {
        root: true,
      });
    },
    async poll() {
      // empty on purpose
    },
    async ensureLoaded(context, parentIds: number[]) {
      const fetchedIds = context.state.fetchedIds;
      const unfetchedIds = _.difference(parentIds, fetchedIds);
      if (unfetchedIds.length === 0) {
        return;
      }
      // marked before the fetch so overlapping calls don't refetch these
      context.commit('fetchedIds', [
        ...fetchedIds,
        ...unfetchedIds,
      ]);
      context.commit('fetchingIds', [
        ...context.state.fetchingIds,
        ...unfetchedIds,
      ]);
      try {
        await context.dispatch('loadMore', {
          params: { parentId: unfetchedIds },
        });
      } finally {
        context.commit(
          'fetchingIds',
          _.difference(context.state.fetchingIds, unfetchedIds)
        );
      }
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  })
}
