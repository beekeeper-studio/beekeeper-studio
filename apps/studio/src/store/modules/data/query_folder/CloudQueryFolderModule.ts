import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { actionsFor, DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";
import { accessGrantMutations, cloudAccessGrantActions } from "@/store/modules/data/access_grant/accessGrantStore";
import { FolderNodeModule } from "@/store/modules/data/tree/FolderNodeModule";
import { SidebarModule } from "@/store/modules/data/tree/SidebarModule";
import _ from "lodash";

type State = DataState<IQueryFolder> & {
  /** Folders whose children have already been fetched. */
  fetchedIds: number[];
};

export const CloudQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
    fetchedIds: [],
  },
  mutations: mutationsFor<IQueryFolder>({
    fetchedIds(state: State, ids: number[]) {
      state.fetchedIds = ids;
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
      await context.dispatch('load', { params: { topLevel: true } });

      // Expand default folders (Personal and Team)
      const defaultIds = context.state.items
        .filter((folder) => folder.default)
        .map((folder) => folder.id);
      context.commit('fetchedIds', defaultIds);
      context.commit('sidebar/expandedIds', defaultIds);
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
      await context.dispatch('loadMore', {
        params: { parentId: unfetchedIds },
      });
    },
    async afterMutate(context, { type, data }) {
      context.commit(`nodes/${type}`, data)
    },
  })
}
