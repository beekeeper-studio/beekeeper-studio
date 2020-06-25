import MenuActions from "../../common/MenuActions"

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
    this.ipcRenderer.on(MenuActions.THEME, this.theme.bind(this))
    this.ipcRenderer.on(MenuActions.MENU_STYLE, this.menuStyle.bind(this))
  }

  theme() {
    this.settings.reload().then(() => {
      document.body.className = `theme-${this.settings.theme}`
    })
  }

  menuStyle() {
    this.vueApp.$noty.success("Restart Beekeeper for the change to take effect")
  }





}