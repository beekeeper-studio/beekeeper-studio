import _ from 'lodash'
import { Module } from 'vuex'
import { TableOrView } from '../../../lib/db/models'

interface TableOptions {
  filePath: string,
  options: {[index: string]: any},
  outputOptions: {[index: string]: any},
  exporter: string,
  fileNameOptions: string
}

interface State {
  tablesToExport: TableOrView[],
  tableOptions: TableOptions | null
}

const MultiTableExportStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    tablesToExport: [],
    tableOptions: null
  }),
  mutations: {
    updateTable(state, tables: TableOrView[]): void {
      state.tablesToExport = tables
    },
    updateOptions(state, val: TableOptions) {
      state.tableOptions = val
    },
    resetModule(state): void {
      state.tablesToExport = []
      state.tableOptions = null
    }
  },
  getters: {
    isSelectTableComplete(state) {
      return Boolean(state.tablesToExport.length)
    },
    isOptionsComplete(state) {
      return _.isObject(state.tableOptions) && !_.isEmpty(state.tableOptions)
    }
  },
  actions: {
    reset(context) {
      context.commit('resetModule');
    }
  }
}


export default MultiTableExportStoreModule
