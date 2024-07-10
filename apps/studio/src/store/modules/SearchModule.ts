import { IConnection } from "@/common/interfaces/IConnection";
import { TransportFavoriteQuery } from "@/common/transport";
import { TableOrView } from "@/lib/db/models";
import FlexSearch from "flexsearch";
import { Module } from "vuex";
import { State as RootState } from '../index'

interface FlexWorker {
  addAsync(id: any, item: string): Promise<void>
  searchAsync(term: string): Promise<number[]>
  removeAsync(id: any): Promise<void>
}

interface IndexItem {
  title: string
  item: TransportFavoriteQuery | TableOrView | IConnection | string
  type: 'query' | 'table' | 'connection' | 'database'
}

interface State {
  searchIndex: FlexWorker
}

export const SearchModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    searchIndex: new FlexSearch.Worker({ tokenize: 'forward' })
  }),
  getters: {
    database(_state: State, _getters, root: RootState): IndexItem[] {
      const tables: IndexItem[] = root.tables.map((t) => {
        const title = t.schema ? `${t.schema}.${t.name}` : t.name
        return { item: t, type: 'table', title, id: title }
      })
      const queryFolders = root['data/queryFolders']['items']
      const favorites: IndexItem[] = root['data/queries']['items'].map((f) => {
        const folder = queryFolders.find((folder) => folder.id === f.queryFolderId)
        const title = folder ? `${folder.name} > ${f.title}` : f.title
        return { item: f, type: 'query', title: title, id: `query-${f.id}` }
      })
      const connectionFolders = root['data/connectionFolders']['items']
      const connections: IndexItem[] = root['data/connections']['items'].map((f) => {
        const folder = connectionFolders.find((folder) => folder.id === f.queryFolderId)
        const title = folder ? `${folder.name} > ${f.name}` : f.name
        return { item: f, type: 'connection', title: `connection: ${title}`, id: `connection-${f.id}`}
      })
      const databases: IndexItem[] = root.databaseList.filter(f => f !== root.database).map((f) => {
        return { item: f, type: 'database', title: `database: ${f}`, id: `database-${f}`}
      })
      return [...tables, ...favorites, ...connections, ...databases]
    },
  },
  mutations: {
  },

}
