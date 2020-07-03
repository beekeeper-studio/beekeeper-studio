import _ from 'lodash'
import AppEvent from '../common/AppEvent'
import { buildWindow } from './WindowBuilder'
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

  zoomreset(m,w) {
    w.webContents.zoomLevel = 0
  }
  zoomin(m,w) {
    w.webContents.zoomLevel += 0.5
  }
  zoomout(m,w) {
    w.webContents.zoomLevel -= 0.5
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
    win.webContents.send(AppEvent.settingsChanged)
  }
  switchMenuStyle = async (menuItem, win) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.menuStyle.value = label.toLowerCase()
    await this.settings.menuStyle.save()
    win.webContents.send(AppEvent.menuStyleChanged)
  }

}
