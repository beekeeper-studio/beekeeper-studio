import _ from 'lodash'
import { Module } from 'vuex'
import { Export } from '../../../lib/export/export'


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
        }
    },
    getters: {
        runningExports(state): Export[] {
            return _.filter(state.exports, {'status': Export.Status.Exporting})
        }
    }
}


export default ExportStoreModule