import { ipcRenderer } from 'electron'
import _ from 'lodash'
import AppEvent from '../../common/AppEvent'

function send(name: string, arg?: any) {
  ipcRenderer.send(AppEvent.menuClick, name, arg)
}

export interface IClientMenuActionHandler {
  quit: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  undo: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  redo: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  cut: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  copy: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  paste: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  selectAll?: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomreset: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomin: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomout: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  fullscreen: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  about: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  devtools: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newWindow: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newQuery: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newTab: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  closeTab: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  switchTheme: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  switchMenuStyle: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  reload: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  disconnect: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  addBeekeeper: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
}

export default class ClientMenuActionHandler implements IClientMenuActionHandler {

  constructor() {}

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
  newWindow = () => send('newWindow')
  newQuery = () => send('newQuery')
  newTab = () => send('newTab')
  closeTab = () => send('closeTab')
  switchTheme = (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    send('switchTheme', label.toLowerCase())
  }
  switchMenuStyle = (menuItem: Electron.MenuItem) => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    send('switchMenuStyle', label.toLowerCase())
  }
  reload = () => send('reload')
  disconnect = () => send('disconnect')
  addBeekeeper = () => send('addBeekeeper')
}

