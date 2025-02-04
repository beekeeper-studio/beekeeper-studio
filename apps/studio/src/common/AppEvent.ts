import Vue from "vue"
import rawLog from '@bksLogger'

const log = rawLog.scope('AppEvent')

export enum AppEvent {
  menuClick = 'menu-click',
  settingsChanged = "sc-refresh",
  newTab = 'nt',
  closeTab = 'ct',
  closeAllTabs = 'close_all_tabs',
  disconnect = 'dc',
  beekeeperAdded = 'bkadd',
  openExternally = 'oe',
  toggleSidebar = 'ts',
  beginExport = 'be',
  beginImport = 'beginImport',
  createTable = 'new_table',
  openTableProperties = 'loadTableProperties',
  loadTable = 'loadTable',
  quickSearch = 'quickSearch',
  promptLogin = 'cloud_signin',
  promptCreateWorkspace = 'cloud_create_workspace',
  promptRenameWorkspace = 'cloud_rename_workspace',
  promptQueryImport = 'cloud_q_import',
  promptQueryExport = 'q_export',
  promptConnectionImport = 'cloud_c_import',
  promptSqlFilesImport = 'q_files_import',
  enterLicense = 'enter_license',
  hideEntity = 'hideEntity',
  hideSchema = 'hideSchema',
  toggleHideEntity = 'toggleHideEntity',
  toggleHideSchema = 'toggleHideSchema',
  exportTables = 'exportTables',
  setDatabaseElementName = 'setDatabaseElementName',
  deleteDatabaseElement = 'deleteDatabaseElement',
  dropDatabaseElement = 'dropDatabaseElement',
  duplicateDatabaseTable = 'duplicateDatabaseTable',
  backupDatabase = 'backupDatabase',
  restoreDatabase = 'restoreDatabase',
  upgradeModal = 'upgradeModal',
  toggleExpandTableList = 'toggleExpandTableList',
  togglePinTableList = 'togglePinTableList',
  dropzoneEnter = 'dropzoneEnter',
  dropzoneDrop = 'dropzoneDrop',
  createConfirmModal = 'createConfirmModal',
  showConfirmModal = 'showConfirmModal',
  /** Triggered when the license valid date or support date has expired */
  licenseExpired = 'licenseExpired',
  /** Triggered when the license valid date has expired */
  licenseValidDateExpired = 'licenseValidDateExpired',
  /** Triggered when the license support date has expired */
  licenseSupportDateExpired = 'licenseSupportDateExpired',
  switchLicenseState = 'switchLicenseState',
  toggleBeta = 'toggleBeta',
  switchUserKeymap = 'switchUserKeymap',
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
      log.debug('trigger', event, args)
      this.$root.$emit(event.toString(), ...args)
    }
  }

})
