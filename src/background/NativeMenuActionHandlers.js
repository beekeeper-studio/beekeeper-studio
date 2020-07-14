import _ from 'lodash'
import AppEvent from '../common/AppEvent'
import { buildWindow, getActiveWindows } from './WindowBuilder'
import { app } from 'electron'
import platformInfo from '../common/platform_info'
import path from 'path'
import { SavedConnection } from '../common/appdb/models/saved_connection'

function getIcon() {
  const iconPrefix = platformInfo.environment === 'development' ? 'public' : ''
  return path.resolve(path.join(__dirname, '..', `${iconPrefix}/icons/png/512x512.png`))
}

export default class {
  constructor(settings) {
    this.settings = settings
  }

  quit() {
    app.quit()
  }

  undo(m, win) {
    win.webContents.undo()
  }
  redo(m, win) {
    win.webContents.redo()
  }
  cut(m, win) {
    win.webContents.cut()
  }
  copy(m, win) {
    win.webContents.copy()


  }
  paste(m, w) {
    w.webContents.paste()
  }

  setZoom = async (level) => {
    getActiveWindows().forEach(window => {
      window.win.webContents.zoomLevel = level
    })
    this.settings.zoomLevel.userValue = level
    await this.settings.zoomLevel.save()
  }

  zoomreset = async () => {
    await this.setZoom(0)
  }
  zoomin = async (m,w) => {
    await this.setZoom(w.webContents.zoomLevel + 0.5)
  }
  zoomout = async (m,w) => {
    await this.setZoom(w.webContents.zoomLevel - 0.5)
  }

  reload = async (m,w) => {
    await w.webContents.reloadIgnoringCache()
  }

  fullscreen(m,w) {
    w.setFullScreen(!w.isFullScreen())
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

  devtools(m,w) {
    w.toggleDevTools()
  }

  newWindow = () => buildWindow(this.settings)

  newQuery = (menuItem, win) => {
    win.webContents.send(AppEvent.newTab)
  }

  newTab = this.newQuery
  closeTab = (menuItem, win) => win.webContents.send(AppEvent.closeTab)

  switchTheme = async (menuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.theme.userValue = label.toLowerCase()
    await this.settings.theme.save()
    getActiveWindows().forEach( window => {
      window.win.webContents.send(AppEvent.settingsChanged)
    })
  }

  addBeekeeper = async (menuItem, win) => {
    const existing = await SavedConnection.findOne({ defaultDatabase: platformInfo.appDbPath })
    if (!existing) {
      const nu = new SavedConnection()
      nu.connectionType = 'sqlite'
      nu.defaultDatabase = platformInfo.appDbPath
      nu.name = "Beekeeper's Database"
      nu.labelColor = 'orange'
      await nu.save()
    }
    win.webContents.send(AppEvent.beekeeperAdded)
  }

  switchMenuStyle = async (menuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.menuStyle.value = label.toLowerCase()
    await this.settings.menuStyle.save()
    getActiveWindows().forEach( window => {
      window.win.webContents.send(AppEvent.menuStyleChanged)
    })
  }

  disconnect = (menuItem, win) => {
    win.webContents.send(AppEvent.disconnect)
  }

}
