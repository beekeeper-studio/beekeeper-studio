import _ from 'lodash'
import {AppEvent} from '../common/AppEvent'
import { buildWindow, getActiveWindows } from './WindowBuilder'
import { app } from 'electron'
import platformInfo from '../common/platform_info'
import path from 'path'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'

type ElectronWindow = Electron.BrowserWindow | undefined

function getIcon() {
  const iconPrefix = platformInfo.environment === 'development' ? 'public' : ''
  return path.resolve(path.join(__dirname, '..', `${iconPrefix}/icons/png/512x512.png`))
}

export default class NativeMenuActionHandlers implements IMenuActionHandler {
  constructor(private settings: IGroupedUserSettings) {}

  quit() {
    app.quit()
  }

  undo(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) {
      win.webContents.undo()
    }
  }
  redo(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.redo()
  }
  cut(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.cut()
  }
  copy(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.copy()
  }
  paste(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.paste()
  }
  selectAll(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.selectAll()
  }

  setZoom = async (level: number) => {
    getActiveWindows().forEach(window => {
      if (window.webContents) {
        window.webContents.zoomLevel = level
      }
    })
    this.settings.zoomLevel.userValue = level
    await this.settings.zoomLevel.save()
  }

  zoomreset = async () => {
    await this.setZoom(0)
  }
  zoomin = async (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) await this.setZoom(win.webContents.zoomLevel + 0.5)
  }
  zoomout = async (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) await this.setZoom(win.webContents.zoomLevel - 0.5)
  }

  reload = async (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) await win.webContents.reloadIgnoringCache()
  }

  fullscreen(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.setFullScreen(!win.isFullScreen())
  }
  about() {
    app.setAboutPanelOptions({
      applicationName: "Beekeeper Studio",
      applicationVersion: app.getVersion(),
      copyright: "Beekeeper Studio Team",
      authors: ["Matthew Rathbone", "Gregory Garden", "All the wonderful Github contributors"],
      website: "https://beekeeperstudio.io",
      iconPath: getIcon()
    })
    app.showAboutPanel()
  }

  devtools(_1: Electron.MenuItem, win: ElectronWindow) {
    if (win) win.webContents.toggleDevTools()
  }

  newWindow = () => buildWindow(this.settings)

  newQuery = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.newTab)
  }

  newTab = this.newQuery
  closeTab = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.closeTab)
  }

  switchTheme = async (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.theme.userValue = label.toLowerCase()
    await this.settings.theme.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.settingsChanged)
    })
  }

  addBeekeeper = async (_1: Electron.MenuItem, win: ElectronWindow) => {
    const existing = await SavedConnection.findOne({where: { defaultDatabase: platformInfo.appDbPath }})
    if (!existing) {
      const nu = new SavedConnection()
      nu.connectionType = 'sqlite'
      nu.defaultDatabase = platformInfo.appDbPath
      nu.name = "Beekeeper's Database"
      nu.labelColor = 'orange'
      await nu.save()
    }
    if (win) win.webContents.send(AppEvent.beekeeperAdded)
  }

  switchMenuStyle = async (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.menuStyle.value = label.toLowerCase()
    await this.settings.menuStyle.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.menuStyleChanged)
    })
  }

  toggleSidebar = async(_menuItem: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.toggleSidebar)
  }

  disconnect = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.disconnect)
  }

}
