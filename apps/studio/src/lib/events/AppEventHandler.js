import { AppEvent } from "../../common/AppEvent"
import rawLog from 'electron-log'

const log = rawLog.scope("AppEventHandler")

export default class {

  vueApp
  ipcRenderer

  constructor(ipcRenderer, vueApp) {
    this.vueApp = vueApp
    this.ipcRenderer = ipcRenderer
  }

  registerCallbacks() {
    this.ipcRenderer.on(AppEvent.settingsChanged, this.settingsChanged.bind(this))
    this.ipcRenderer.on(AppEvent.menuStyleChanged, this.menuStyle.bind(this))
    this.ipcRenderer.on(AppEvent.disconnect, this.disconnect.bind(this))
    this.ipcRenderer.on(AppEvent.beekeeperAdded, this.addBeekeeper.bind(this))
    this.forward(AppEvent.closeTab)
    this.forward(AppEvent.newTab)
    this.forward(AppEvent.toggleSidebar)
    this.forward(AppEvent.quickSearch)
    this.forward(AppEvent.upgradeModal)
    this.forward(AppEvent.promptSqlFilesImport)
  }

  forward(event) {
    const emit = () => {
      log.debug("Received from electron, forwarding to app", event)
      this.vueApp.$emit(event)
    }
    this.ipcRenderer.on(event, emit.bind(this))
  }

  closeTab() {
    this.vueApp.$emit(AppEvent.closeTab)
  }

  addBeekeeper() {
    this.vueApp.$noty.success("Beekeeper's Database has been added to your Saved Connections")
    this.vueApp.$store.dispatch('data/connections/load')
  }

  disconnect() {
    this.vueApp.$store.dispatch('disconnect')
  }

  settingsChanged() {
    this.vueApp.$store.dispatch("settings/initializeSettings")
  }

  menuStyle() {
    this.vueApp.$noty.success("Restart Beekeeper for the change to take effect")
  }
}
