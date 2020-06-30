import AppEvent from "../../common/AppEvent"

export default class {

  vueApp
  ipcRenderer

  constructor(ipcRenderer, vueApp) {
    this.vueApp = vueApp
    this.ipcRenderer = ipcRenderer
    this.registerCallbacks()
  }

  registerCallbacks() {
    this.ipcRenderer.on(AppEvent.settingsChanged, this.settingsChanged.bind(this))
    this.ipcRenderer.on(AppEvent.menuStyleChanged, this.menuStyle.bind(this))
  }

  settingsChanged() {
    this.vueApp.$store.dispatch("settings/initializeSettings")
  }

  menuStyle() {
    this.vueApp.$noty.success("Restart Beekeeper for the change to take effect")
  }





}