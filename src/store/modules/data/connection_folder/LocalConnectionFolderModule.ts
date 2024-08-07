import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { DataState, DataStore, mutationsFor } from "@/store/modules/data/DataModuleBase";

interface State extends DataState<IConnectionFolder> {
  unsupported: boolean
}

export const LocalConnectionFolderModule: DataStore<IConnectionFolder, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    unsupported: true,
    pollError: null
  },
  mutations: mutationsFor<IConnectionFolder>({}),
  actions: {
    async load() { 
      // TODO: implement
    },
    async poll() { 
      // TODO: implement
    },
    async save(_context, item) { return item },
    async remove() { 
      // TODO: implement
    },
    async clone(_c, item) { return item },
    async reload(_c, id) { return { id, name: "Not implemented" } },
    async clearError() { 
      // TODO: implement
    } 
  }
}
