import MenuActions from "../../common/AppEvent"
import AppEvent from "../../common/AppEvent"

export default class {

  vueApp
  settings
  ipcRenderer

  constructor(ipcRenderer, vueApp, settings) {
    this.vueapp = vueApp
    this.ipcRenderer = ipcRenderer
    this.settings = settings
    console.log('this settings', this.settings)
    this.registerCallbacks()
  }

  registerCallbacks() {
    this.ipcRenderer.on(AppEvent.settingsChanged, this.settingsChanged.bind(this))
    this.ipcRenderer.on(AppEvent.menuStyleChanged, this.menuStyle.bind(this))
  }

  settingsChanged() {
    this.vueApp.$store.dispatch("initializeSettings")
  }

  menuStyle() {
    this.vueApp.$noty.success("Restart Beekeeper for the change to take effect")
  }





}