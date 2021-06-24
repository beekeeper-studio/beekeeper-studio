import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { ipcRenderer } from 'electron'
import _ from 'lodash'
import {AppEvent} from '../../common/AppEvent'

function send(name: string, arg?: any) {
  ipcRenderer.send(AppEvent.menuClick, name, arg)
}

export default class ClientMenuActionHandler implements IMenuActionHandler {

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
  toggleSidebar = () => send('toggleSidebar')
}

