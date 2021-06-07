import MenuBuilder from '../common/menus/MenuBuilder'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'
import { ipcMain, BrowserWindow } from 'electron'
import {AppEvent} from '../common/AppEvent'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from 'electron-log'

const log = rawLog.scope('NativeMenuBuilder')

export default class NativeMenuBuilder {
  private builder?: MenuBuilder
  private handler: NativeMenuActionHandlers
  private menu?: Electron.Menu

  constructor(private electron: any, settings: IGroupedUserSettings){
    this.handler = new NativeMenuActionHandlers(settings)
    if (!settings.menuStyle || settings.menuStyle.value === 'native') {
      this.builder = new MenuBuilder(settings, this.handler)
    }
  }

  initialize() {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      log.info("MENUTEMPLATE", template)
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
      this.listenForClicks()
    }
  }

  listenForClicks() {
    ipcMain.on(AppEvent.menuClick, (event, actionName: keyof NativeMenuActionHandlers, arg) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        if (window) {
          const func = this.handler[actionName].bind(this.handler)
          func(arg || null, window)
        }
      } catch (e) {
        console.error(`Couldn't trigger action ${actionName}(${arg || ""}), ${e.message}`)
      }
    })
  }
}
