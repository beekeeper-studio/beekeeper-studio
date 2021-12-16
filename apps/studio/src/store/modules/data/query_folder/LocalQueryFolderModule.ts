import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

interface State extends DataState<IQueryFolder> {
  unsupported: boolean
}

export const LocalQueryFolderModule: DataStore<IQueryFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    unsupported: true,
    pollError: null
  },
  mutations: mutationsFor<IQueryFolder>({}),
  actions: {
    async load() {},
    async poll() {},
    async save(_context, item) { return item },
    async remove() {},
    async clone(_c, item) { return item},
    async reload(_c, id) { return {id, name: "Not implemented"}}
  }
}