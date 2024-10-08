import { TransportExport } from '@/common/transport/TransportExport';
import { ExportProgress, ExportStatus } from '@/lib/export/models';
import _ from 'lodash'
import Vue from 'vue';
import { Module } from 'vuex'

interface State {
  exports: TransportExport[]
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
    },
    async retryExportForTable(_context, id) {
      await Vue.prototype.$util.send('export/start', { id });
    },
    async retryFailedExports() {
      await Vue.prototype.$util.send('export/retryFailed');
    }
  },
  mutations: {
    addExport(state, exp: TransportExport): void {
      state.exports.push(exp)
    },
    setExports(state, exports: TransportExport[]) {
      state.exports = exports;
    },
    removeExport(state, exp: TransportExport): void {
      state.exports = _.without(state.exports, exp);
    },
    updateProgressFor(state: State, { id, progress }: { id: string, progress: ExportProgress}): void {
      const exp = state.exports.find((value) => value.id === id);
      exp.percentComplete = progress.percentComplete;
      exp.status = progress.status;
    }
  },
  getters: {
    exports(state): TransportExport[] {
      return state.exports;
    },
    runningExports(state)  {
      return _.filter(state.exports, { 'status': ExportStatus.Exporting })
    },
    hasRunningExports(_state, getters): boolean {
      return getters.runningExports.length > 0
    }
  }
}


export default ExportStoreModule
