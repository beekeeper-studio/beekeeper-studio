import _ from 'lodash'
import Vue from 'vue';
import { Module } from 'vuex'
import { Export } from '../../../lib/export/export'

interface State {
  exports: string[]
}

const ExportStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    exports: [],
  }),
  actions: {
    async removeInactive(context): Promise<void> {
      const filtered = await Vue.prototype.$util.send('export/removeInactive')
      context.commit('setExports', filtered);
    },
    async removeExport(context, id): Promise<void> {
      await Vue.prototype.$util.send('export/remove', {id});
      context.commit('removeExport', id);
    }
  },
  mutations: {
    addExport(state, exportId: string): void {
      console.log('adding export: ', exportId);
      state.exports.push(exportId)
    },
    setExports(state, exports: string[]) {
      state.exports = exports;
    },
    removeExport(state, id: string): void {
      state.exports = _.without(state.exports, id);
    },
  },
  getters: {
    exports(state): string[] {
      return state.exports;
    },
    // not sure either of these are useful anymore
    runningExports(_state): Export[] {
      return []
      // return _.filter(state.exports, { 'status': ExportStatus.Exporting })
    },
    hasRunningExports(_state, getters): boolean {
      return getters.runningExports.length > 0
    }
  }
}


export default ExportStoreModule
