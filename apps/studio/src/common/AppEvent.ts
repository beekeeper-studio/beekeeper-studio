import Vue from "vue"
import rawLog from 'electron-log'

const log = rawLog.scope('AppEvent')

export enum AppEvent {
  menuClick = 'menu-click',
  settingsChanged = "sc-refresh",
  menuStyleChanged = 'mc-style',
  newTab = 'nt',
  closeTab = 'ct',
  disconnect = 'dc',
  beekeeperAdded = 'bkadd',
  openExternally = 'oe',
  toggleSidebar = 'ts',
  beginExport = 'be',
  createTable = 'new_table',
  openTableProperties = 'loadTableProperties',
  loadTable = 'loadTable',
  alterTable = 'alterTable',
  tableAltered = 'tableAltered',
  quickSearch = 'quickSearch',
  promptLogin = 'cloud_signin',
  promptQueryImport = 'cloud_q_import',
  promptConnectionImport = 'cloud_c_import',
  hideEntity = 'hideEntity',
  hideSchema = 'hideSchema',
  deleteDatabaseElement = 'deleteDatabaseElement',
  dropDatabaseElement = 'dropDatabaseElement',
  duplicateDatabaseTable = 'duplicateDatabaseTable',
  upgradeModal = 'showUpgradeModal'
}

export interface RootBinding {
  event: string
  handler(arg: any): void
}


export const AppEventMixin = Vue.extend({
  methods:  {
    registerHandlers(bindings: RootBinding[]) {
      bindings.forEach(({ event, handler }) => {
        this.$root.$on(event, handler)
      })
    },
    unregisterHandlers(bindings: RootBinding[]) {
      bindings.forEach(({ event, handler }) => {
        this.$root.$off(event, handler)
      })
    },
    trigger(event: AppEvent, ...args: any) {
      log.debug('trigger', event, ...args)
      this.$root.$emit(event.toString(), ...args)
    }
  }

})
