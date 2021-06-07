import _ from 'lodash'
import { Module } from 'vuex'
import { Export } from '../../../lib/export/export'
import { ExportStatus } from '../../../lib/export/models'

interface State {
  exports: Export[]
}

const ExportStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    exports: [],
  }),
  mutations: {
    addExport(state, newExport: Export): void {
      state.exports.push(newExport)
    },
    removeExport(state, id: string): void {
      state.exports = _.reject(state.exports, { 'id': id })
    },
    removeInactive(state): void {
      state.exports = _.filter(state.exports, { 'status': ExportStatus.Exporting })
    }
  },
  getters: {
    runningExports(state): Export[] {
      return _.filter(state.exports, { 'status': ExportStatus.Exporting })
    },
    hasRunningExports(_state, getters): boolean {
      return getters.runningExports.length > 0
    }
  }
}


export default ExportStoreModule
