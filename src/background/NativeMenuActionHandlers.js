import _ from 'lodash'
import AppEvent from '../common/AppEvent'
import { buildWindow, getActiveWindows } from './WindowBuilder'
import { app } from 'electron'


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

  switchTheme = async (menuItem, win) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.theme.userValue = label.toLowerCase()
    await this.settings.theme.save()
    getActiveWindows().forEach( window => {
      window.win.webContents.send(AppEvent.settingsChanged)
    })
  }
  switchMenuStyle = async (menuItem, win) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.menuStyle.value = label.toLowerCase()
    await this.settings.menuStyle.save()
    getActiveWindows().forEach( window => {
      window.win.webContents.send(AppEvent.menuStyleChanged)
    })
  }

}
