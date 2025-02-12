
import { Module } from 'vuex'
import { TableOrView } from '../../../lib/db/models'

interface ImportOptions {
  fileName: string
  columnDelimeter: string | null
  quoteCharacter: string | null
  escapeCharacter: string | null
  newlineCharacter: string | null
  nullableValues: string[]
  trimWhitespaces: boolean 
  truncateTable: boolean
  useHeaders: boolean
  fileType: string
  table: TableOrView
  importMap: ImportMap[] | null
  sheet: string | null
  runAsUpsert: boolean
}

interface ImportMap {
  fileColumn: string
  tableColumn: string
}

interface ImportTable{
  table: string
  importOptions: ImportOptions
}

interface State {
  tablesToImport: Map<string, ImportOptions>
}

const ImportStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    tablesToImport: new Map<string, ImportOptions>(),
  }),
  mutations: {
    upsertImport(state, update: ImportTable) {
      if( state.tablesToImport.has(update.table) ) {
        state.tablesToImport.set(update.table, update.importOptions)
      } else {
        state.tablesToImport.set(update.table, update.importOptions)
      }
    },
    removeImport(state, key: string) {
      state.tablesToImport.delete(key)
    }
  },
  actions: {
  },
  getters: {
    getImportOptions: (state) => (key) => {
      return state.tablesToImport.get(key)
    }
  }
}


export default ImportStoreModule
