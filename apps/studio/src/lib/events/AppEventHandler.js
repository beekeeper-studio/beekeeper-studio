import { AppEvent } from "../../common/AppEvent"
import rawLog from '@bksLogger'
import { SmartLocalStorage } from '@/common/LocalStorage'

const log = rawLog.scope("AppEventHandler")

export default class {
  vueApp

  constructor(vueApp) {
    this.vueApp = vueApp
  }

  registerCallbacks() {
    window.main.on(AppEvent.settingsChanged, this.settingsChanged.bind(this))
    window.main.on(AppEvent.disconnect, this.disconnect.bind(this))
    window.main.on(AppEvent.beekeeperAdded, this.addBeekeeper.bind(this))
    window.main.on(AppEvent.switchLicenseState, this.switchLicenseState.bind(this))
    this.forward(AppEvent.closeTab)
    this.forward(AppEvent.newTab)
    this.forward(AppEvent.newCustomTab)
    this.forward(AppEvent.togglePrimarySidebar)
    this.forward(AppEvent.toggleSecondarySidebar)
    this.forward(AppEvent.quickSearch)
    this.forward(AppEvent.enterLicense)
    this.forward(AppEvent.backupDatabase);
    this.forward(AppEvent.restoreDatabase);
    this.forward(AppEvent.exportTables);
    this.forward(AppEvent.upgradeModal)
    this.forward(AppEvent.promptSqlFilesImport)
    this.forward(AppEvent.updatePin)
    this.forward(AppEvent.settingsChanged)
    this.forward(AppEvent.openPluginManager)
    this.forward(AppEvent.pluginMenuClicked)
  }

  forward(event) {
    const emit = (_e, ...args) => {
      log.debug("Received from electron, forwarding to app", event)
      this.vueApp.$emit(event, ...args)
    }
    window.main.on(event, emit.bind(this))
  }

  closeTab() {
    this.vueApp.$emit(AppEvent.closeTab)
  }

  async addBeekeeper() {
    const existing = await this.vueApp.$util.send('appdb/saved/findOneBy', { options: { defaultDatabase: platformInfo.appDbPath }});
    if (!existing) {
      const nu = {};
      nu.connectionType = 'sqlite'
      nu.defaultDatabase = platformInfo.appDbPath
      nu.name = "Beekeeper's Database"
      nu.labelColor = 'orange'
      await this.vueApp.$util.send('appdb/saved/save', { obj: nu });
    }
    this.vueApp.$noty.success("Beekeeper's Database has been added to your Saved Connections")
    this.vueApp.$store.dispatch('data/connections/load')
  }

  disconnect() {
    this.vueApp.$store.dispatch('disconnect')
  }

  settingsChanged() {
    this.vueApp.$store.dispatch("settings/initializeSettings")
  }

  async switchLicenseState(_event, state) {
    await this.vueApp.$util.send('dev/switchLicenseState', { state })
    this.vueApp.$store.dispatch("toggleShowBeginTrialModal", true)
    SmartLocalStorage.setBool('expiredLicenseEventsEmitted', false)
    window.location.reload(true)
  }
}
