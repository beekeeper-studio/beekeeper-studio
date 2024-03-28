import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { ipcRenderer } from 'electron'
import _ from 'lodash'
import {AppEvent} from '../../common/AppEvent'
import rawLog from 'electron-log'

const log = rawLog.scope("ClientMenuActionHandler")


function send(name: string, arg?: any) {
  log.debug("Sending menu action to electron thread", name, arg)
  ipcRenderer.send(AppEvent.menuClick, name, arg)
}

export default class ClientMenuActionHandler implements IMenuActionHandler {

  constructor() {
    // TODO: implement
  }
  upgradeModal = () => send('upgradeModal')

  quit = () => send('quit')
  undo = () => send('undo')
  redo = () => send('redo')
  cut = () => send('cut')
  copy = () => send('copy')
  paste = () => send('paste')
  selectAll = () => send('selectAll')
  zoomreset = () => send('zoomreset')
  zoomin = () => send('zoomin')
  zoomout = () => send('zoomout')
  fullscreen = () => send('fullscreen')
  about = () => send('about')
  devtools = () => send('devtools')
  opendocs = () => send('opendocs')
  newWindow = () => send('newWindow')
  newQuery = () => send('newQuery')
  newTab = () => send('newTab')
  closeTab = () => send('closeTab')
  quickSearch  = () => send('quickSearch')
  switchTheme = (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    send('switchTheme', label.toLowerCase().replaceAll(" ", "-"))
  }
  switchMenuStyle = (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    send('switchMenuStyle', label.toLowerCase())
  }
  reload = () => send('reload')
  disconnect = () => send('disconnect')
  addBeekeeper = () => send('addBeekeeper')
  toggleSidebar = () => send('toggleSidebar')
  enterLicense = () => send('enterLicense')
  backupDatabase = () => send('backupDatabase')
  restoreDatabase = () => send('restoreDatabase')
  exportTables = () => send('exportTables')
  checkForUpdates = () => send('checkForUpdates')
  importSqlFiles = () => send('importSqlFiles')
}
