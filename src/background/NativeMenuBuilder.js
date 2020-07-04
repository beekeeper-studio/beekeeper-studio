import NativeMenuBuilder from '../common/menus/MenuBuilder'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'
import { ipcMain, BrowserWindow } from 'electron'
import AppEvent from '../common/AppEvent'

export default class {
  builder = null
  electron = null
  handler = null

  constructor(electron, settings){
    this.handler = new NativeMenuActionHandlers(settings)
    this.electron = electron
    if (!settings.menuStyle || settings.menuStyle.value === 'native') {
      this.builder = new NativeMenuBuilder(settings, this.handler)
    }
  }

  initialize() {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      console.log("MENUTEMPLATE", template)
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
      this.listenForClicks()
    }
  }

  listenForClicks() {
    ipcMain.on(AppEvent.menuClick, (event, actionName, arg) => {
      try {
        const func = this.handler[actionName].bind(this.handler)
        func(arg || null, BrowserWindow.fromWebContents(event.sender))
      } catch (e) {
        console.error(`Couldn't trigger action ${actionName}(${arg || ""}), ${e.message}`)
      }
    })
  }
}